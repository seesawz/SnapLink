'use server'

import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
import { initDb, createLink as dbCreateLink, getLink, incrementViewAndGetContent } from '@/lib/db'

const MAX_CONTENT_LENGTH = 100_000
const EXPIRY_OPTIONS: Record<string, number> = {
  '5min': 5 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
}

export interface CreateLinkResult {
  id: string
  url: string
  maxViews: number
  expiresAt: string | null
}

export async function createLink(
  content: string,
  maxViews: number = 1,
  expiresIn: 'never' | '5min' | '1hour' | '1day' = '1hour'
): Promise<CreateLinkResult> {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Content is required')
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error('Content too long')
  }

  const views = Math.min(Math.max(1, Number(maxViews) || 1), 100)
  const expiresAt =
    expiresIn === 'never' || !EXPIRY_OPTIONS[expiresIn]
      ? null
      : new Date(Date.now() + EXPIRY_OPTIONS[expiresIn])

  await initDb()

  const id = nanoid(21)
  await dbCreateLink(id, content.trim(), views, expiresAt)

  return {
    id,
    url: `/v/${id}`,
    maxViews: views,
    expiresAt: expiresAt?.toISOString() ?? null,
  }
}

export interface LinkMeta {
  remainingViews: number
  maxViews: number
  expiresAt: string | null
}

export async function getLinkMeta(id: string): Promise<LinkMeta | { error: string; code: number }> {
  if (!id) {
    return { error: 'Invalid id', code: 400 }
  }

  try {
    const link = await getLink(id)
    if (!link) {
      return { error: 'not_found', code: 404 }
    }

    const now = new Date()
    if (link.expires_at && new Date(link.expires_at) <= now) {
      return { error: 'expired', code: 410 }
    }
    if (link.view_count >= link.max_views) {
      return { error: 'max_views', code: 410 }
    }

    const remainingViews = link.max_views - link.view_count
    return {
      remainingViews,
      maxViews: link.max_views,
      expiresAt: link.expires_at ? new Date(link.expires_at).toISOString() : null,
    }
  } catch (e) {
    console.error('Get link meta error:', e)
    return { error: 'Failed to fetch link', code: 500 }
  }
}

export interface LinkContentResult {
  content: string
  remainingViews: number
  burned: boolean
}

export async function getLinkContent(id: string): Promise<LinkContentResult | { error: string; code: number }> {
  if (!id) {
    return { error: 'Invalid id', code: 400 }
  }

  // Get client IP from headers
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  let viewerIp = 'unknown'
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) viewerIp = first
  } else {
    const real = headersList.get('x-real-ip')
    if (real) viewerIp = real.trim()
  }

  try {
    const result = await incrementViewAndGetContent(id, viewerIp)

    if (result === 'not_found') {
      return { error: 'not_found', code: 404 }
    }

    if (result === 'expired') {
      return { error: 'expired', code: 410 }
    }

    if (result === 'max_views') {
      return { error: 'max_views', code: 410 }
    }

    return {
      content: result.content,
      remainingViews: result.remainingViews,
      burned: result.remainingViews <= 0,
    }
  } catch (e) {
    console.error('Get link content error:', e)
    return { error: 'Failed to fetch link', code: 500 }
  }
}
