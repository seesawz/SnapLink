import { NextRequest, NextResponse } from 'next/server'
import { getLink, incrementViewAndGetContent } from '@/lib/db'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const viewerIp = getClientIp(request)

  try {
    const result = await incrementViewAndGetContent(id, viewerIp)

    if (result === 'not_found') {
      return NextResponse.json({ error: 'not_found', message: 'Link not found or no longer valid' }, { status: 404 })
    }

    if (result === 'expired') {
      return NextResponse.json({ error: 'expired', message: 'Link has expired' }, { status: 410 })
    }

    if (result === 'max_views') {
      return NextResponse.json({ error: 'max_views', message: 'Maximum views reached', burned: true }, { status: 410 })
    }

    return NextResponse.json({
      content: result.content,
      remainingViews: result.remainingViews,
      expiresAt: result.expiresAt,
      burned: result.remainingViews <= 0,
    })
  } catch (e) {
    console.error('Get link error:', e)
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
  }
}

export async function HEAD(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return new NextResponse(null, { status: 400 })

  try {
    const link = await getLink(id)
    if (!link) return new NextResponse(null, { status: 404 })

    const now = new Date()
    if (link.expires_at && new Date(link.expires_at) <= now) {
      return new NextResponse(null, { status: 410 })
    }
    if (link.view_count >= link.max_views) {
      return new NextResponse(null, { status: 410 })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Remaining-Views': String(link.max_views - link.view_count),
        ...(link.expires_at && {
          'X-Expires-At': new Date(link.expires_at).toISOString(),
        }),
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
