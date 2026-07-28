'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, LogOut, ChevronDown, Home, User, NotebookPen, Globe } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { useLang } from '@/lib/i18n'
import { NotificationBell } from '@/components/layout/notification-bell'
import type { Profile } from '@/types/database'

interface HeaderProps {
  profile?: Profile
  onMenuClick: () => void
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('')
}

const ROLE_COLORS: Record<string, string> = {
  coordinator: 'bg-brand-600',
  sales_engineer: 'bg-green-600',
  installation: 'bg-purple-600',
  admin: 'bg-rose-600',
}

const DASHBOARD_LINK: Record<string, string> = {
  coordinator: '/dashboard',
  sales_engineer: '/dashboard',
  admin: '/dashboard',
  installation: '/installation',
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { lang, setLang, t } = useLang()
  const roleLabel = (r: string) => t(('role.' + r) as never)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const dashboardHref = profile ? (DASHBOARD_LINK[profile.role] ?? '/dashboard') : '/dashboard'

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/60 px-4 shadow-sm lg:px-6">
      {/* Right side — mobile menu + logo (desktop) */}
      <div className="flex items-center gap-3">
        {/* Hamburger — always visible */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label={t('nav.menu')}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <Link href={dashboardHref} className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 p-1 shadow-sm">
            <Image
              src="/logo-white.jpg"
              alt="سمنان"
              width={24}
              height={24}
              className="object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-sm font-bold text-brand-800 group-hover:text-brand-600 transition-colors">{t('app.samnan')}</p>
            <p className="text-[10px] text-gray-400">{t('app.admin_platform')}</p>
          </div>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Home button */}
        <Link
          href={dashboardHref}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-700 transition-colors"
          title={t('nav.home')}
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">{t('nav.home')}</span>
        </Link>

      </div>

      {/* Left side — language + bell + user */}
      <div className="flex items-center gap-3">
        {/* Language switch — flips the whole platform */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-all duration-200 hover:border-brand-300 hover:text-brand-700 hover:-translate-y-px hover:shadow-sm"
          title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          <Globe className="h-3.5 w-3.5" />
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>

        {/* Notification bell */}
        {profile && <NotificationBell />}

        {profile && <div className="h-7 w-px bg-gray-200" />}

        {/* User avatar dropdown */}
        {profile && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <div className="hidden sm:block text-end">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{profile.full_name}</p>
                <p className="text-xs text-gray-500 leading-tight">{roleLabel(profile.role)}</p>
              </div>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name}
                  className="h-9 w-9 rounded-full object-cover shadow-sm" />
              ) : (
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${ROLE_COLORS[profile.role] ?? 'bg-gray-600'}`}>
                  {getInitials(profile.full_name)}
                </div>
              )}
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute end-0 top-full mt-2 w-60 rounded-2xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden animate-scale-in origin-top-left">
                {/* User card */}
                <div className="border-b border-gray-50 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt={profile.full_name}
                        className="h-11 w-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shrink-0 ${ROLE_COLORS[profile.role] ?? 'bg-gray-600'}`}>
                        {getInitials(profile.full_name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile.full_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{roleLabel(profile.role)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    {t('nav.profile')}
                  </Link>
                  <Link
                    href="/notebook"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <NotebookPen className="h-4 w-4 text-gray-400" />
                    {t('nav.notebook')}
                  </Link>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Home className="h-4 w-4 text-gray-400" />
                    {t('nav.home')}
                  </Link>

                  {/* Sign out — NO onClick that closes dropdown before form submits */}
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.signout')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
