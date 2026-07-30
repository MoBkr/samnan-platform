'use client'

import Link from 'next/link'
import { FolderKanban, Building2, Calendar, Lock, ChevronLeft } from 'lucide-react'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { formatDateShort } from '@/lib/utils'
import type { MyInstallProject, ColleagueInstallProject } from '@/lib/actions/installation'

// The installation manager's projects list, driven by the dashboard's scope
// switch: "مشاريعي" = my projects in full; "كل المشاريع" = everyone's — mine
// clickable, colleagues' listed too but entry is denied on their page.
export function InstallationProjects({
  mine, colleagues, scope,
}: {
  mine: MyInstallProject[]
  colleagues: ColleagueInstallProject[]
  scope: 'mine' | 'all'
}) {
  const showColleagues = scope === 'all'
  const empty = mine.length === 0 && (!showColleagues || colleagues.length === 0)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-purple-600" />
          <h2 className="font-semibold text-gray-900">{scope === 'mine' ? 'مشاريعي' : 'كل المشاريع'}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
            {mine.length + (showColleagues ? colleagues.length : 0)}
          </span>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center py-10 text-center">
          <FolderKanban className="h-7 w-7 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">لا توجد مشاريع بعد</p>
        </div>
      ) : (
        <>
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
                          <span className="font-bold text-brand-800" dir="ltr">{formatDateShort(p.start_date)}{p.expected_end_date && ` — ${formatDateShort(p.expected_end_date)}`}</span>
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

            {showColleagues && colleagues.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors opacity-75">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <Lock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{p.project_name}</p>
                      <p className="text-xs text-gray-400">المدير المسؤول: {p.manager_name}</p>
                    </div>
                  </div>
                  <ProjectStatusBadge status={p.status as never} />
                </Link>
              </li>
            ))}
          </ul>
          {showColleagues && colleagues.length > 0 && (
            <p className="border-t border-gray-50 px-5 py-2.5 text-[11px] text-gray-400">
              🔒 مشاريع الزملاء تظهر هنا للاطلاع — الدخول لتفاصيلها متاح لمديرها المعيّن فقط.
            </p>
          )}
        </>
      )}
    </div>
  )
}
