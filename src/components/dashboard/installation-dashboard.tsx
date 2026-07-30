'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Hammer, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InstallationStatusBadge } from '@/components/shared/status-badge'
import { InstallationProjects } from '@/components/dashboard/installation-projects'
import { formatDateShort, cn } from '@/lib/utils'
import type { Profile, Installation } from '@/types/database'
import type { MyInstallProject, ColleagueInstallProject } from '@/lib/actions/installation'

interface InstallationDashboardProps {
  profile: Profile
  installations: (Installation & { project: { id: string; client_name: string; project_name: string; installation_id?: string | null } })[]
  projects?: { mine: MyInstallProject[]; colleagues: ColleagueInstallProject[] }
}

export function InstallationDashboard({ profile, installations, projects }: InstallationDashboardProps) {
  const isInstallRole = profile.role === 'installation'
  // One scope drives EVERYTHING on the page: the stats, the schedule and the
  // projects list. مشاريعي = only what's assigned to me; كل المشاريع = everyone's.
  const [scope, setScope] = useState<'mine' | 'all'>('mine')

  const scoped = isInstallRole && scope === 'mine'
    ? installations.filter((i) => i.project?.installation_id === profile.id)
    : installations

  const today = new Date().toISOString().split('T')[0]
  const open = scoped.filter((i) => i.status !== 'completed')
  const completedCount = scoped.length - open.length
  const todayInstallations = open.filter((i) => i.scheduled_date === today)
  const upcoming = open.filter((i) => i.scheduled_date && i.scheduled_date > today)
  const pending = open.filter((i) => i.status === 'scheduled')

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-purple-800 to-purple-900 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -left-8 h-48 w-48 rounded-full bg-purple-400 blur-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-purple-200 text-sm">فريق التركيبات</p>
          <h1 className="text-2xl font-bold mt-1">مرحباً، {profile.full_name}</h1>
          <p className="text-purple-200 text-sm mt-1">
            {todayInstallations.length > 0
              ? `${todayInstallations.length} تركيب مجدول اليوم`
              : 'لا توجد تركيبات اليوم'}
          </p>
        </div>
      </div>

      {/* Scope switch — drives the stats, schedule and projects below */}
      {isInstallRole && (
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setScope('mine')}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              scope === 'mine' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            مشاريعي
          </button>
          <button
            onClick={() => setScope('all')}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              scope === 'all' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            كل المشاريع
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { icon: <Hammer className="h-5 w-5" />, bg: 'bg-emerald-50 text-emerald-700', value: todayInstallations.length, label: 'تركيب اليوم' },
          { icon: <Calendar className="h-5 w-5" />, bg: 'bg-blue-50 text-blue-700', value: upcoming.length, label: 'قادم قريباً' },
          { icon: <Clock className="h-5 w-5" />, bg: 'bg-amber-50 text-amber-700', value: pending.length, label: 'لم يبدأ بعد' },
          { icon: <CheckCircle2 className="h-5 w-5" />, bg: 'bg-gray-50 text-gray-600', value: completedCount, label: 'مكتمل' },
        ].map(({ icon, bg, value, label }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Projects — mine in full; on "كل المشاريع" everyone's are listed but
          opening someone else's is denied */}
      {isInstallRole && projects && (
        <InstallationProjects mine={projects.mine} colleagues={projects.colleagues} scope={scope} />
      )}

      {/* Today alert */}
      {todayInstallations.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900 mb-3">تركيبات اليوم</p>
          <div className="space-y-2">
            {todayInstallations.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 border border-emerald-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{inst.project.project_name}</p>
                  <p className="text-xs text-gray-500">{inst.project.client_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <InstallationStatusBadge status={inst.status} />
                  <Link href={`/projects/${inst.project.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8">تفاصيل</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full schedule */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">جدول التركيبات</h2>
            {pending.length > 0 && (
              <Badge variant="warning" className="text-xs">{pending.length} لم يبدأ</Badge>
            )}
          </div>
        </div>
        {open.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <Hammer className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">لا توجد مواعيد تركيب</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {open.map((inst) => (
              <li key={inst.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{inst.project.project_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">{inst.project.client_name}</p>
                    {inst.scheduled_date && (
                      <span className={`text-xs ${inst.scheduled_date === today ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                        — <span className="font-bold text-brand-800">{inst.scheduled_date === today ? 'اليوم' : formatDateShort(inst.scheduled_date)}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <InstallationStatusBadge status={inst.status} />
                  <Link href={`/projects/${inst.project.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8">عرض</Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
