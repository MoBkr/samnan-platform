'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Building2, Calendar, Lock, ChevronLeft } from 'lucide-react'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { formatDateShort, cn } from '@/lib/utils'
import type { MyInstallProject, ColleagueInstallProject } from '@/lib/actions/installation'

// The installation manager's projects hub — like the coordinators' list:
// "مشاريعي" in full (clickable), colleagues' projects only as existing
// (name + manager + status; no details by design).
export function InstallationProjects({
  mine, colleagues,
}: {
  mine: MyInstallProject[]
  colleagues: ColleagueInstallProject[]
}) {
  const [tab, setTab] = useState<'mine' | 'colleagues'>('mine')

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-purple-600" />
          <h2 className="font-semibold text-gray-900">المشاريع</h2>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setTab('mine')}
            className={cn('rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
              tab === 'mine' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            مشاريعي ({mine.length})
          </button>
          <button
            onClick={() => setTab('colleagues')}
            className={cn('rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
              tab === 'colleagues' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            مشاريع الزملاء ({colleagues.length})
          </button>
        </div>
      </div>

      {tab === 'mine' ? (
        mine.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <FolderKanban className="h-7 w-7 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">لا توجد مشاريع معيّنة لك بعد</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {mine.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-purple-50/40 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                      {p.project_name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-gray-400" />{p.client_name}</span>
                      {p.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatDateShort(p.start_date)}{p.expected_end_date && ` — ${formatDateShort(p.expected_end_date)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ProjectStatusBadge status={p.status as never} />
                    <ChevronLeft className="h-4 w-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : colleagues.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <FolderKanban className="h-7 w-7 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">لا توجد مشاريع لدى الزملاء حالياً</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-50">
            {colleagues.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex items-center gap-2.5">
                  <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{p.project_name}</p>
                    <p className="text-xs text-gray-400">المدير المسؤول: {p.manager_name}</p>
                  </div>
                </div>
                <ProjectStatusBadge status={p.status as never} />
              </li>
            ))}
          </ul>
          <p className="border-t border-gray-50 px-5 py-2.5 text-[11px] text-gray-400">
            للاطلاع فقط — تفاصيل كل مشروع متاحة لمديره المعيّن.
          </p>
        </>
      )}
    </div>
  )
}
