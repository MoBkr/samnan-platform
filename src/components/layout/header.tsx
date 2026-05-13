'use client'

import { Menu, Bell } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile } from '@/types/database'

interface HeaderProps {
  profile?: Profile
  onMenuClick: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
}

const ROLE_COLORS: Record<string, string> = {
  coordinator: 'bg-blue-600',
  sales_engineer: 'bg-green-600',
  supply: 'bg-amber-600',
  installation: 'bg-purple-600',
  admin: 'bg-rose-600',
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="القائمة"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Left side (RTL = end) — user info */}
      <div className="ms-auto flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* Divider */}
        {profile && <div className="h-7 w-px bg-gray-200" />}

        {/* User info */}
        {profile && (
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block text-end">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{profile.full_name}</p>
              <p className="text-xs text-gray-500 leading-tight">{ROLE_LABELS[profile.role]}</p>
            </div>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${ROLE_COLORS[profile.role] ?? 'bg-gray-600'}`}
            >
              {getInitials(profile.full_name)}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
