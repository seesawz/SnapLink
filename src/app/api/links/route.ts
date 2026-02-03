import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { initDb, createLink } from '@/lib/db'

const MAX_CONTENT_LENGTH = 100_000
const EXPIRY_OPTIONS: Record<string, number> = {
  '5min': 5 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, maxViews = 1, expiresIn = 'never' } = body

    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: 'Content too long' }, { status: 400 })
    }

    const views = Math.min(Math.max(1, Number(maxViews) || 1), 100)
    const expiresAt = expiresIn === 'never' || !EXPIRY_OPTIONS[expiresIn] ? null : new Date(Date.now() + EXPIRY_OPTIONS[expiresIn])

    await initDb()

    const id = nanoid(21)
    await createLink(id, content.trim(), views, expiresAt)

    return NextResponse.json({
      id,
      url: `${request.nextUrl.origin}/v/${id}`,
      maxViews: views,
      expiresAt: expiresAt?.toISOString() ?? null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Create link error:', e)
    if (message.includes('ENCRYPTION_KEY')) {
      return NextResponse.json({ error: 'Server configuration error: ENCRYPTION_KEY is not set. Add it in Vercel Environment Variables.' }, { status: 503 })
    }
    if (message.includes('Database is not configured') || message.includes('POSTGRES')) {
      return NextResponse.json({ error: 'Server configuration error: Database (POSTGRES_URL) is not configured.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
