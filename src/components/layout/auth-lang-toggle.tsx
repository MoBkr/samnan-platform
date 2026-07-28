'use client'

import { Globe } from 'lucide-react'
import { useLang } from '@/lib/i18n'

/** Floating AR/EN switch for the public auth pages (login, signup, reset). */
export function AuthLangToggle() {
  const { lang, setLang } = useLang()
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className="fixed top-4 end-4 z-50 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur transition-all duration-200 hover:border-brand-200 hover:text-brand-700 hover:shadow"
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === 'ar' ? 'EN' : 'عربي'}
    </button>
  )
}
