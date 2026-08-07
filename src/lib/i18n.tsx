'use client'

// ─── Platform language switch (AR ⇄ EN) ───
// One provider drives the whole app: the chosen language persists in
// localStorage, flips <html> dir/lang, and t() serves the dictionary.
// Entered data (names, notes…) always renders as typed.

import { createContext, useContext, useEffect, useState } from 'react'
import { DICT, type DictKey } from '@/lib/i18n-dict'

export type Lang = 'ar' | 'en'

const LangContext = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: DictKey) => string
}>({ lang: 'ar', setLang: () => {}, t: (k) => DICT[k]?.ar ?? k })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')

  // Restore once on mount (client only — SSR always renders Arabic first)
  useEffect(() => {
    const saved = window.localStorage.getItem('samnan-lang')
    if (saved === 'en') setLangState('en')
  }, [])

  // Flip document direction + language whenever it changes.
  // Inline style is required: globals.css sets `html { direction: rtl }`
  // which outweighs the dir attribute alone.
  useEffect(() => {
    const dir = lang === 'en' ? 'ltr' : 'rtl'
    document.documentElement.dir = dir
    document.documentElement.style.direction = dir
    document.documentElement.lang = lang
  }, [lang])

  // Whole-app phrase translation: in English mode, every known Arabic UI
  // phrase in the DOM is swapped for English and kept in sync as React
  // re-renders. Switching back restores the authored Arabic exactly.
  //
  // The engine pulls in the ~94KB phrase dictionary, so it is imported
  // dynamically — Arabic (the default) never pays for it. Because the import
  // resolves asynchronously, the stop function is stored on a ref-like local
  // and the cleanup guards against being torn down before it arrives.
  useEffect(() => {
    if (lang !== 'en') return

    let stop: (() => void) | null = null
    let cancelled = false

    void import('@/lib/i18n-dom').then(({ startDomTranslation }) => {
      if (cancelled) return
      stop = startDomTranslation()
    })

    return () => {
      cancelled = true
      stop?.()
      stop = null
    }
  }, [lang])

  function setLang(l: Lang) {
    setLangState(l)
    window.localStorage.setItem('samnan-lang', l)
  }

  const t = (key: DictKey) => DICT[key]?.[lang] ?? DICT[key]?.ar ?? key

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
