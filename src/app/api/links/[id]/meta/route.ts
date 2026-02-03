import { NextRequest, NextResponse } from 'next/server'
import { getLink } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const link = await getLink(id)
    if (!link) {
      return NextResponse.json({ error: 'not_found', message: 'Link not found or no longer valid' }, { status: 404 })
    }

    const now = new Date()
    if (link.expires_at && new Date(link.expires_at) <= now) {
      return NextResponse.json({ error: 'expired', message: 'Link has expired' }, { status: 410 })
    }
    if (link.view_count >= link.max_views) {
      return NextResponse.json({ error: 'max_views', message: 'Maximum views reached' }, { status: 410 })
    }

    const remainingViews = link.max_views - link.view_count
    return NextResponse.json({
      remainingViews,
      maxViews: link.max_views,
      expiresAt: link.expires_at ? new Date(link.expires_at).toISOString() : null,
    })
  } catch (e) {
    console.error('Get link meta error:', e)
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
  }
}
