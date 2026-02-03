import { Pool } from 'pg'

export type LinkRow = {
  id: string
  content: string
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

const memoryStore = new Map<
  string,
  {
    content: string
    max_views: number
    view_count: number
    expires_at: Date | null
    created_at: Date
  }
>()

function useMemory(): boolean {
  return !connectionString
}

export async function initDb(): Promise<void> {
  const p = getPool()
  if (!p) return

  await p.query(`
    CREATE TABLE IF NOT EXISTS links (
      id VARCHAR(21) PRIMARY KEY,
      content TEXT NOT NULL,
      max_views INT NOT NULL DEFAULT 1,
      view_count INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function createLink(id: string, content: string, maxViews: number, expiresAt: Date | null): Promise<void> {
  if (useMemory()) {
    memoryStore.set(id, {
      content,
      max_views: maxViews,
      view_count: 0,
      expires_at: expiresAt,
      created_at: new Date(),
    })
    return
  }

  await initDb()
  const p = getPool()!
  await p.query(
    `INSERT INTO links (id, content, max_views, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [id, content, maxViews, expiresAt ? expiresAt.toISOString() : null]
  )
}

export async function getLink(id: string): Promise<LinkRow | null> {
  if (useMemory()) {
    const row = memoryStore.get(id)
    if (!row) return null
    return {
      id,
      content: row.content,
      max_views: row.max_views,
      view_count: row.view_count,
      expires_at: row.expires_at,
      created_at: row.created_at,
    }
  }

  const p = getPool()
  if (!p) return null

  const { rows } = await p.query<LinkRow>(
    `SELECT id, content, max_views, view_count, expires_at, created_at
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

export type ConsumeResult = { content: string; remainingViews: number; expiresAt: string | null } | 'expired' | 'max_views' | 'not_found'

async function deleteLink(id: string): Promise<void> {
  if (useMemory()) {
    memoryStore.delete(id)
    return
  }
  const p = getPool()
  if (p) await p.query('DELETE FROM links WHERE id = $1', [id])
}

export async function incrementViewAndGetContent(id: string): Promise<ConsumeResult> {
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

  const newCount = link.view_count + 1

  if (useMemory()) {
    const row = memoryStore.get(id)
    if (!row) return 'not_found'
    row.view_count = newCount
    if (newCount >= link.max_views) memoryStore.delete(id)
    return {
      content: link.content,
      remainingViews: link.max_views - newCount,
      expiresAt: link.expires_at ? new Date(link.expires_at).toISOString() : null,
    }
  }

  const p = getPool()!
  await p.query('UPDATE links SET view_count = $1 WHERE id = $2', [newCount, id])

  const remainingViews = link.max_views - newCount
  if (newCount >= link.max_views) await deleteLink(id)

  return {
    content: link.content,
    remainingViews,
    expiresAt: link.expires_at ? new Date(link.expires_at).toISOString() : null,
  }
}

export function isUsingMemory(): boolean {
  return useMemory()
}

export function getMemoryStoreSize(): number {
  return useMemory() ? memoryStore.size : 0
}
