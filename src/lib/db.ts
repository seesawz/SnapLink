import { Pool } from 'pg'
import { encryptWithKey, encryptKeyWithMaster, decryptKeyWithMaster, randomLinkKey } from './crypto'

export const DB_NOT_CONFIGURED = 'Database is not configured. Set POSTGRES_URL or DATABASE_URL in .env.local (or Vercel environment variables).'

export type LinkRow = {
  id: string
  content: string
  content_key: string | null
  max_views: number
  view_count: number
  expires_at: Date | null
  created_at: Date
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL

let pool: Pool | null = null

function getPool(): Pool | null {
  if (!connectionString) return null
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }
  return pool
}

export function requirePool(): Pool {
  const p = getPool()
  if (!p) throw new Error(DB_NOT_CONFIGURED)
  return p
}

export function hasDbConfig(): boolean {
  return !!connectionString
}

export async function initDb(): Promise<void> {
  const p = requirePool()
  await p.query(`
    CREATE TABLE IF NOT EXISTS links (
      id VARCHAR(21) PRIMARY KEY,
      content TEXT NOT NULL,
      content_key TEXT,
      max_views INT NOT NULL DEFAULT 1,
      view_count INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  try {
    await p.query(`ALTER TABLE links ADD COLUMN content_key TEXT`)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code !== '42701') throw e
  }
  await p.query(`
    CREATE TABLE IF NOT EXISTS link_views (
      link_id VARCHAR(21) NOT NULL,
      viewer_ip VARCHAR(45) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (link_id, viewer_ip),
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    )
  `)
}

export async function createLink(id: string, content: string, maxViews: number, expiresAt: Date | null): Promise<void> {
  await initDb()
  const p = requirePool()
  const linkKey = randomLinkKey()
  const ciphertext = encryptWithKey(content, linkKey)
  const contentKeyEnc = encryptKeyWithMaster(linkKey)
  await p.query(
    `INSERT INTO links (id, content, content_key, max_views, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, ciphertext, contentKeyEnc, maxViews, expiresAt ? expiresAt.toISOString() : null]
  )
}

export async function getLink(id: string): Promise<LinkRow | null> {
  const p = requirePool()
  const { rows } = await p.query<LinkRow>(
    `SELECT id, content, content_key, max_views, view_count, expires_at, created_at
     FROM links WHERE id = $1`,
    [id]
  )
  const r = rows[0]
  if (!r) return null
  return {
    ...r,
    expires_at: r.expires_at ? new Date(r.expires_at) : null,
    created_at: new Date(r.created_at),
  }
}

export type ConsumeResult = { content: string; key: string; remainingViews: number; expiresAt: string | null } | 'expired' | 'max_views' | 'not_found'

async function deleteLink(id: string): Promise<void> {
  const p = requirePool()
  await p.query('DELETE FROM links WHERE id = $1', [id])
}

export async function incrementViewAndGetContent(id: string, viewerIp: string): Promise<ConsumeResult> {
  const link = await getLink(id)
  if (!link) return 'not_found'

  if (link.expires_at && new Date(link.expires_at) <= new Date()) {
    await deleteLink(id)
    return 'expired'
  }

  if (link.view_count >= link.max_views) {
    await deleteLink(id)
    return 'max_views'
  }

  const p = requirePool()
  const ip = (viewerIp || '').trim() || 'unknown'

  const { rows: viewRows } = await p.query<{ link_id: string }>(`SELECT 1 FROM link_views WHERE link_id = $1 AND viewer_ip = $2`, [id, ip])
  const alreadyViewed = viewRows.length > 0

  const keyHex = link.content_key ? decryptKeyWithMaster(link.content_key).toString('hex') : ''
  const remainingViews = link.max_views - link.view_count
  const payload = {
    content: link.content,
    key: keyHex,
    remainingViews,
    expiresAt: link.expires_at ? new Date(link.expires_at).toISOString() : null,
  }

  if (alreadyViewed) return payload

  await p.query(`INSERT INTO link_views (link_id, viewer_ip) VALUES ($1, $2)`, [id, ip])
  const newCount = link.view_count + 1
  await p.query('UPDATE links SET view_count = $1 WHERE id = $2', [newCount, id])
  if (newCount >= link.max_views) await deleteLink(id)

  return { ...payload, remainingViews: link.max_views - newCount }
}
