'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Hammer,
  Users,
  LogOut,
  X,
  Wallet,
  FileBarChart2,
  ShoppingCart,
  ScrollText,
  HardHat,
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
    label: 'التركيبات',
    href: '/installation',
    icon: <Hammer className="h-5 w-5" />,
    roles: ['installation', 'coordinator', 'admin'],
  },
  {
    label: 'الفنيون',
    href: '/technicians',
    icon: <HardHat className="h-5 w-5" />,
    roles: ['installation', 'coordinator', 'admin'],
  },
  {
    label: 'طلبات المشتريات',
    href: '/purchase-requests',
    icon: <ShoppingCart className="h-5 w-5" />,
    roles: ['coordinator', 'admin'],
  },
  {
    label: 'التقارير',
    href: '/reports',
    icon: <FileBarChart2 className="h-5 w-5" />,
    roles: ['coordinator', 'admin'],
  },
  {
    label: 'سجل التدقيق',
    href: '/audit-log',
    icon: <ScrollText className="h-5 w-5" />,
    roles: ['coordinator', 'admin'],
  },
]

const ADMIN_ITEMS: NavItem[] = [
  {
    label: 'إدارة المستخدمين',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin'],
  },
]

const AVATAR_COLORS: Record<string, string> = {
  coordinator: 'bg-blue-500',
  sales_engineer: 'bg-emerald-500',
  installation: 'bg-purple-500',
  admin: 'bg-rose-500',
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('')
}

interface SidebarProps {
  profile: Profile
  onClose?: () => void
}

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role))
  const visibleAdminItems = ADMIN_ITEMS.filter((item) => item.roles.includes(profile.role))

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar">
      {/* Logo Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 p-1.5">
            <Image
              src="/logo.png"
              alt="سمنان"
              width={28}
              height={28}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">منصة سمنان</p>
            <p className="text-xs text-slate-500 leading-tight">سمنان القابضة</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* User Profile Card */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 px-3 py-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shrink-0 ${AVATAR_COLORS[profile.role] ?? 'bg-slate-600'}`}
          >
            {getInitials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white leading-tight">{profile.full_name}</p>
            <p className="text-xs text-slate-400 leading-tight mt-0.5">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Main items */}
        <div>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-600">القائمة</p>
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-900/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span className={cn('transition-transform', isActive ? 'text-white' : 'text-slate-500 group-hover:text-white')}>
                      {item.icon}
                    </span>
                    {item.label}
                    {isActive && (
                      <span className="ms-auto h-1.5 w-1.5 rounded-full bg-blue-300" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Admin section */}
        {visibleAdminItems.length > 0 && (
          <div>
            <div className="mb-2 px-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">الإدارة</p>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <ul className="space-y-0.5">
              {visibleAdminItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const isReports = item.href === '/reports'
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? isReports
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-brand-600 text-white shadow-sm shadow-brand-900/30'
                          : isReports
                            ? 'text-teal-400 hover:bg-teal-500/10 hover:text-teal-300'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <span className={cn(
                        'transition-transform',
                        isActive ? 'text-white' : isReports ? 'text-teal-400 group-hover:text-teal-300' : 'text-slate-500 group-hover:text-white'
                      )}>
                        {item.icon}
                      </span>
                      {item.label}
                      {isActive && (
                        <span className={cn('ms-auto h-1.5 w-1.5 rounded-full', isReports ? 'bg-teal-300' : 'bg-blue-300')} />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/5">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </form>
        <a
          href="https://tfco.sa/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center justify-center gap-1 py-1 text-[10px] text-slate-700 hover:text-slate-500 transition-colors"
        >
          <span>built by</span>
          <span className="font-semibold tracking-wide">Thakaa Flow</span>
        </a>
      </div>
    </div>
  )
}
