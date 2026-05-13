'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Truck,
  Hammer,
  Users,
  LogOut,
  ChevronLeft,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import type { Profile } from '@/types/database'
import { ROLE_LABELS } from '@/lib/constants'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'لوحة التحكم',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['coordinator', 'sales_engineer', 'admin'],
  },
  {
    label: 'المشاريع',
    href: '/projects',
    icon: <FolderKanban className="h-5 w-5" />,
    roles: ['coordinator', 'sales_engineer', 'admin'],
  },
  {
    label: 'المدفوعات',
    href: '/payments',
    icon: <Wallet className="h-5 w-5" />,
    roles: ['coordinator', 'admin'],
  },
  {
    label: 'التوريد',
    href: '/supply',
    icon: <Truck className="h-5 w-5" />,
    roles: ['supply', 'coordinator', 'admin'],
  },
  {
    label: 'التركيبات',
    href: '/installation',
    icon: <Hammer className="h-5 w-5" />,
    roles: ['installation', 'coordinator', 'admin'],
  },
  {
    label: 'إدارة المستخدمين',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin'],
  },
]

interface SidebarProps {
  profile: Profile
  onClose?: () => void
}

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role))

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Image
              src="/logo.png"
              alt="سمنان"
              width={28}
              height={28}
              className="object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white">منصة سمنان</p>
            <p className="text-xs text-slate-400">سمنان القابضة</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {profile.full_name[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-slate-700 p-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-600/20 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  )
}
