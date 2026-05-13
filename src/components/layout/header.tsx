'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'
import { signOut } from '@/lib/actions/auth'
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
  supply: 'bg-amber-600',
  installation: 'bg-purple-600',
  admin: 'bg-rose-600',
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="القائمة"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ms-auto flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

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
                <p className="text-xs text-gray-500 leading-tight">{ROLE_LABELS[profile.role]}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${ROLE_COLORS[profile.role] ?? 'bg-gray-600'}`}>
                {getInitials(profile.full_name)}
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
              <div className="absolute end-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white shadow-lg z-50 overflow-hidden">
                {/* User info */}
                <div className="border-b border-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shrink-0 ${ROLE_COLORS[profile.role] ?? 'bg-gray-600'}`}>
                      {getInitials(profile.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.full_name}</p>
                      <p className="text-xs text-gray-500">{ROLE_LABELS[profile.role]}</p>
                    </div>
                  </div>
                </div>

                {/* Sign out */}
                <div className="p-1.5">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <LogOut className="h-4 w-4" />
                      تسجيل الخروج
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
