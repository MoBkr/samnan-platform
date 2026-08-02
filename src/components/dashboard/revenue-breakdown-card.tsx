'use client'

import { useState } from 'react'
import { TrendingUp, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/constants'
import type { Project, ProjectStatus } from '@/types/database'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-blue-400',
  completed: 'bg-emerald-400',
  on_hold: 'bg-amber-400',
  cancelled: 'bg-red-400',
}

interface RevenueBreakdownCardProps {
  projects: Project[]
  label?: string
  iconBg?: string
}

// Statuses that count toward the live headline value (cancelled & completed excluded)
const LIVE_STATUSES: ProjectStatus[] = ['active', 'on_hold']

export function RevenueBreakdownCard({ projects, label = 'إجمالي القيمة القائمة', iconBg = 'bg-emerald-100 text-emerald-700' }: RevenueBreakdownCardProps) {
  const [open, setOpen] = useState(false)

  // Headline = active + on_hold only (cancelled projects don't inflate the total)
  const total = projects
    .filter((p) => LIVE_STATUSES.includes(p.status))
    .reduce((s, p) => s + (p.total_amount ?? 0), 0)

  const statuses: ProjectStatus[] = ['active', 'on_hold', 'completed', 'cancelled']
  const breakdown = statuses.map((status) => {
    const group = projects.filter((p) => p.status === status)
    return {
      status,
      count: group.length,
      value: group.reduce((s, p) => s + (p.total_amount ?? 0), 0),
      live: LIVE_STATUSES.includes(status),
    }
  }).filter((b) => b.count > 0)

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-brand-300 ${open ? 'border-brand-200' : 'border-gray-100'}`}>
      {/* Same visual language as the other KPI cards: icon, value, label —
          plus an explicit "التفاصيل ▾" affordance so it reads as clickable. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative w-full p-5 text-start cursor-pointer"
      >
        <span className="absolute top-3 left-3 flex items-center gap-0.5 text-[10px] font-medium text-gray-300 transition-colors group-hover:text-brand-600">
          التفاصيل
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180 text-brand-600' : ''}`} />
        </span>
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          <TrendingUp className="h-6 w-6" />
        </div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          <span dir="ltr" className="inline-block">{formatCurrency(total)}</span>
        </p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
        <p className="text-xs mt-1 font-medium text-gray-400 group-hover:text-brand-600 transition-colors">
          اضغط لعرض التفصيل حسب الحالة
        </p>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2.5 bg-gray-50/30">
          {breakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">لا توجد مشاريع</p>
          ) : (
            breakdown.map(({ status, count, value, live }) => (
              <div key={status} className={`flex items-center justify-between ${live ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_COLORS[status]}`} />
                  <span className="text-sm text-gray-700">{STATUS_LABELS[status]}</span>
                  <span className="text-xs text-gray-400">({count})</span>
                  {!live && <span className="text-[10px] text-gray-400">غير محتسبة</span>}
                </div>
                <span className={`text-sm font-semibold text-gray-800 ${live ? '' : 'line-through'}`}>{formatCurrency(value)}</span>
              </div>
            ))
          )}
          <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">الإجمالي القائم (نشط + معلق)</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
