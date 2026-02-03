'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { messages, type Locale } from '@/lib/messages'

type Messages = (typeof messages)[Locale]

const LangContext = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: Messages
} | null>(null)

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh')
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l === 'zh' ? 'zh' : 'en'
    }
  }, [])
  const t = messages[locale]

  return <LangContext.Provider value={{ locale, setLocale, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
