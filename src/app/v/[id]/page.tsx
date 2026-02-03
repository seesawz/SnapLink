'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { Lock, Eye, AlertCircle, Clock } from 'lucide-react'
import { getLinkMeta, getLinkContent } from '@/lib/actions'

type Meta = {
  remainingViews: number
  maxViews: number
  expiresAt: string | null
}

type ViewState =
  | { status: 'loading' }
  | { status: 'meta'; meta: Meta }
  | {
      status: 'content'
      content: string
      remainingViews: number
      burned: boolean
    }
  | { status: 'error'; kind: 'not_found' | 'expired' | 'max_views' | 'rate_limited' }

function useCountdown(expiresAt: string | null) {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt) {
      setLeft(null)
      return
    }
    const target = new Date(expiresAt).getTime()
    const tick = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((target - now) / 1000))
      setLeft(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return left
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ViewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { t } = useLang()
  const [state, setState] = useState<ViewState>({ status: 'loading' })

  const metaExpiresAt = state.status === 'meta' ? state.meta.expiresAt : null
  const countdownSeconds = useCountdown(metaExpiresAt)

  const fetchMeta = useCallback(async () => {
    const result = await getLinkMeta(id)
    if ('error' in result) {
      if (result.code === 404) {
        setState({ status: 'error', kind: 'not_found' })
        return
      }
      if (result.code === 410) {
        setState({
          status: 'error',
          kind: result.error === 'expired' ? 'expired' : 'max_views',
        })
        return
      }
      setState({ status: 'error', kind: 'not_found' })
      return
    }
    setState({
      status: 'meta',
      meta: {
        remainingViews: result.remainingViews,
        maxViews: result.maxViews,
        expiresAt: result.expiresAt,
      },
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchMeta()
  }, [id, fetchMeta])

  async function handleViewContent() {
    const result = await getLinkContent(id)

    if ('error' in result) {
      const kind = result.code === 429 ? 'rate_limited' : result.error === 'expired' ? 'expired' : result.error === 'max_views' ? 'max_views' : 'not_found'
      setState({ status: 'error', kind })
      return
    }

    setState({
      status: 'content',
      content: result.content,
      remainingViews: result.remainingViews,
      burned: result.burned,
    })
  }

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft flex items-center gap-2 text-text-muted">
          <Lock className="w-5 h-5" />
          <span>Loading…</span>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    const isExpired = state.kind === 'expired' || state.kind === 'max_views'
    const isRateLimited = state.kind === 'rate_limited'
    const title = isRateLimited ? t.rateLimitedTitle : isExpired ? t.burned : t.notFound
    const desc = isRateLimited ? t.rateLimitedDesc : t.burnedDesc
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-surface-muted">
            <AlertCircle className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-text-muted text-sm">{desc}</p>
          <button type="button" onClick={() => router.push('/')} className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition">
            {t.backHome}
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'meta') {
    const { meta } = state
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
            <Lock className="w-6 h-6 text-accent" />
            <span className="font-semibold">{t.title}</span>
          </div>
        </header>
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="p-6 rounded-2xl bg-surface-muted border border-border space-y-6">
              <div className="flex items-center justify-center gap-2 text-accent">
                <Eye className="w-5 h-5" />
                <span className="font-medium">{t.remainingViews}</span>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {meta.remainingViews} / {meta.maxViews}
              </p>
              {meta.expiresAt && countdownSeconds !== null && (
                <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{t.timeLeft}</span>
                  <span className="tabular-nums font-medium text-accent animate-countdown-tick" key={countdownSeconds}>
                    {formatCountdown(countdownSeconds)}
                  </span>
                </div>
              )}
            </div>
            <button type="button" onClick={handleViewContent} className="w-full py-3 px-4 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition">
              {t.viewContent}
            </button>
            <p className="text-text-muted text-xs">{t.shareHint}</p>
          </div>
        </main>
      </div>
    )
  }

  const { content, remainingViews, burned } = state
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-accent" />
            <span className="font-semibold">{t.title}</span>
          </div>
          <button type="button" onClick={() => router.push('/')} className="text-sm text-text-muted hover:text-accent transition">
            {t.backHome}
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        {burned && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{t.burned}</span>
          </div>
        )}
        <div className="p-6 rounded-2xl bg-surface-muted border border-border">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm">{content}</pre>
        </div>
        {!burned && remainingViews > 0 && (
          <p className="mt-4 text-text-muted text-sm">
            {t.remainingViews}: {remainingViews}
          </p>
        )}
        <button type="button" onClick={() => router.push('/')} className="mt-6 text-accent hover:underline text-sm">
          {t.backHome}
        </button>
      </main>
    </div>
  )
}
