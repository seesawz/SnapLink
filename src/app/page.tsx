'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { DonateModal } from '@/components/DonateModal'
import { Lock, Link2, Copy, Check, Heart } from 'lucide-react'
import { createLink } from '@/lib/actions'

type ExpiresIn = 'never' | '5min' | '1hour' | '1day'

export default function HomePage() {
  const { t, locale, setLocale } = useLang()
  const [content, setContent] = useState('')
  const [maxViews, setMaxViews] = useState(1)
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('1hour')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    url: string
    id: string
    maxViews: number
    expiresAt: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const data = await createLink(content.trim(), maxViews, expiresIn)
      setResult({
        url: `${window.location.origin}${data.url}`,
        id: data.id,
        maxViews: data.maxViews,
        expiresAt: data.expiresAt,
      })
    } catch (err) {
      console.error(err)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!result?.url) return
    await navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-accent" aria-hidden />
            <span className="font-semibold text-lg">{t.title}</span>
            <span className="text-text-muted text-sm hidden sm:inline">{t.tagline}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-sm">{t.lang}</span>
            <button type="button" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')} className="text-sm px-2 py-1 rounded bg-surface-muted hover:bg-border transition">
              {locale === 'zh' ? t.en : t.zh}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <p className="text-text-muted text-center mb-8">{t.description}</p>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="content" className="sr-only">
                {t.contentPlaceholder}
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.contentPlaceholder}
                required
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                maxLength={100000}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxViews" className="block text-sm text-text-muted mb-1">
                  {t.maxViews}
                </label>
                <select
                  id="maxViews"
                  value={maxViews}
                  onChange={(e) => setMaxViews(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {[1, 3, 5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} {t.views}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="expiresIn" className="block text-sm text-text-muted mb-1">
                  {t.expiresIn}
                </label>
                <select
                  id="expiresIn"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value as ExpiresIn)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="never">{t.never}</option>
                  <option value="5min">{t['5min']}</option>
                  <option value="1hour">{t['1hour']}</option>
                  <option value="1day">{t['1day']}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full py-3 px-4 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? t.creating : t.createLink}
              <Link2 className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <p className="text-accent font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t.yourLink}
            </p>
            <div className="flex gap-2">
              <input type="text" readOnly value={result.url} className="flex-1 px-4 py-3 rounded-xl bg-surface-muted border border-border text-sm" />
              <button type="button" onClick={copyLink} className="px-4 py-3 rounded-xl bg-accent text-white hover:bg-accent-hover transition flex items-center gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t.copyLink}
                  </>
                )}
              </button>
            </div>
            <p className="text-text-muted text-sm">{t.shareHint}</p>
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setContent('')
              }}
              className="text-accent hover:underline text-sm"
            >
              {locale === 'zh' ? '再生成一个链接' : 'Create another link'}
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-text-muted text-sm">
        <span>SnapLink — {t.tagline}</span>
        <button type="button" onClick={() => setDonateOpen(true)} className="inline-flex items-center gap-1 text-accent hover:underline">
          <Heart className="w-4 h-4" />
          {t.donate}
        </button>
      </footer>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </div>
  )
}
