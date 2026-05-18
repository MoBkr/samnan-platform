'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateShort, cn } from '@/lib/utils'
import { ROLE_LABELS, STATUS_LABELS, PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants'
import type { Profile } from '@/types/database'
import type { ProjectReport, PaymentReport, ActivityLogReport } from '@/lib/actions/reports'

type ReportTab = 'projects' | 'payments' | 'team' | 'activity'

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'projects', label: 'المشاريع' },
  { id: 'payments', label: 'الدفعات' },
  { id: 'team', label: 'الفريق' },
  { id: 'activity', label: 'سجل النشاطات' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'text-blue-700 bg-blue-50',
  completed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-700 bg-red-50',
  on_hold: 'text-amber-700 bg-amber-50',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'text-emerald-700 bg-emerald-50',
  partial: 'text-blue-700 bg-blue-50',
  pending: 'text-amber-700 bg-amber-50',
  overdue: 'text-red-700 bg-red-50',
  cancelled: 'text-gray-500 bg-gray-100',
}

interface ReportsViewProps {
  projects: ProjectReport[]
  payments: PaymentReport[]
  team: Profile[]
  activity: ActivityLogReport[]
}

export function ReportsView({ projects, payments, team, activity }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('projects')

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? ''
  const printDate = new Date().toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* ─── Screen header ─── */}
      <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
          <p className="text-sm text-gray-500 mt-0.5">تصدير بيانات المنصة — للإدارة فقط</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 shrink-0">
          <Printer className="h-4 w-4" />
          طباعة / تحميل PDF
        </Button>
      </div>

      {/* ─── Tab nav ─── */}
      <div className="no-print flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Print header (hidden on screen) ─── */}
      <div className="print-only mb-6 pb-5 border-b-2 border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">مجموعة سمنان القابضة</p>
            <h1 className="text-2xl font-bold text-gray-900">تقرير {tabLabel}</h1>
          </div>
          <div className="text-left text-sm text-gray-500 mt-1">
            <p>تاريخ الإصدار: {printDate}</p>
          </div>
        </div>
      </div>

      {/* ─── Report body ─── */}
      {activeTab === 'projects' && <ProjectsReport projects={projects} />}
      {activeTab === 'payments' && <PaymentsReport payments={payments} />}
      {activeTab === 'team' && <TeamReport team={team} />}
      {activeTab === 'activity' && <ActivityLogTable activity={activity} />}
    </div>
  )
}

/* ══════════════════════════════════════
   Projects Report
══════════════════════════════════════ */
function ProjectsReport({ projects }: { projects: ProjectReport[] }) {
  const active = projects.filter(p => p.status === 'active').length
  const completed = projects.filter(p => p.status === 'completed').length
  const onHold = projects.filter(p => p.status === 'on_hold').length
  const totalValue = projects.reduce((s, p) => s + (p.total_amount ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 no-print">
        <StatCard label="إجمالي المشاريع" value={projects.length} color="bg-gray-50 border-gray-200" />
        <StatCard label="نشطة" value={active} color="bg-blue-50 border-blue-200" textColor="text-blue-700" />
        <StatCard label="مكتملة" value={completed} color="bg-emerald-50 border-emerald-200" textColor="text-emerald-700" />
        <StatCard label="معلقة" value={onHold} color="bg-amber-50 border-amber-200" textColor="text-amber-700" />
        <StatCard label="إجمالي القيمة" value={formatCurrency(totalValue)} color="bg-brand-50 border-brand-200" textColor="text-brand-700" isText />
      </div>

      {/* Print stats */}
      <div className="print-only grid grid-cols-5 gap-3 mb-4 text-sm">
        <div className="text-center"><p className="font-bold text-2xl">{projects.length}</p><p className="text-gray-500">إجمالي</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-blue-700">{active}</p><p className="text-gray-500">نشطة</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-emerald-700">{completed}</p><p className="text-gray-500">مكتملة</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-amber-700">{onHold}</p><p className="text-gray-500">معلقة</p></div>
        <div className="text-center"><p className="font-bold text-lg text-brand-700">{formatCurrency(totalValue)}</p><p className="text-gray-500">إجمالي القيمة</p></div>
      </div>

      <ReportTable
        headers={['المشروع', 'العميل', 'الحالة', 'المبلغ', 'الكوردنيتر', 'مهندس المبيعات', 'تاريخ البدء']}
        rows={projects.map(p => [
          <span key="name" className="font-medium text-gray-900">{p.project_name}</span>,
          p.client_name,
          <StatusPill key="status" label={STATUS_LABELS[p.status] ?? p.status} colorClass={STATUS_COLORS[p.status]} />,
          p.total_amount ? formatCurrency(p.total_amount) : '—',
          p.coordinator?.full_name ?? '—',
          p.sales_engineer?.full_name ?? '—',
          p.start_date ? formatDateShort(p.start_date) : '—',
        ])}
        empty="لا توجد مشاريع"
      />
    </div>
  )
}

/* ══════════════════════════════════════
   Payments Report
══════════════════════════════════════ */
function PaymentsReport({ payments }: { payments: PaymentReport[] }) {
  const totalAmount = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalCollected = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  const totalOverdue = payments.filter(p => p.status === 'overdue').length
  const paidCount = payments.filter(p => p.status === 'paid').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 no-print">
        <StatCard label="إجمالي الدفعات" value={payments.length} color="bg-gray-50 border-gray-200" />
        <StatCard label="مكتملة الدفع" value={paidCount} color="bg-emerald-50 border-emerald-200" textColor="text-emerald-700" />
        <StatCard label="متأخرة" value={totalOverdue} color="bg-red-50 border-red-200" textColor="text-red-700" />
        <StatCard label="إجمالي المحصّل" value={`${formatCurrency(totalCollected)} / ${formatCurrency(totalAmount)}`} color="bg-brand-50 border-brand-200" textColor="text-brand-700" isText />
      </div>

      <div className="print-only grid grid-cols-4 gap-3 mb-4 text-sm">
        <div className="text-center"><p className="font-bold text-2xl">{payments.length}</p><p className="text-gray-500">إجمالي الدفعات</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-emerald-700">{paidCount}</p><p className="text-gray-500">مكتملة</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-red-700">{totalOverdue}</p><p className="text-gray-500">متأخرة</p></div>
        <div className="text-center"><p className="font-bold text-base text-brand-700">{formatCurrency(totalCollected)}</p><p className="text-gray-500">المحصّل</p></div>
      </div>

      <ReportTable
        headers={['المشروع', 'العميل', 'نوع الدفعة', 'المبلغ', 'المحصّل', 'المتبقي', 'الحالة', 'تاريخ الاستحقاق']}
        rows={payments.map(p => [
          <span key="name" className="font-medium text-gray-900">{p.project?.project_name ?? '—'}</span>,
          p.project?.client_name ?? '—',
          PAYMENT_TYPE_LABELS[p.type] ?? p.type,
          formatCurrency(p.amount),
          formatCurrency(p.paid_amount),
          <span key="rem" className={p.amount - p.paid_amount > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
            {formatCurrency(Math.max(0, p.amount - p.paid_amount))}
          </span>,
          <StatusPill key="status" label={PAYMENT_STATUS_LABELS[p.status] ?? p.status} colorClass={PAYMENT_STATUS_COLORS[p.status]} />,
          p.due_date ? formatDateShort(p.due_date) : '—',
        ])}
        empty="لا توجد دفعات"
      />
    </div>
  )
}

/* ══════════════════════════════════════
   Team Report
══════════════════════════════════════ */
function TeamReport({ team }: { team: Profile[] }) {
  const roleCount = team.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})
  const activeCount = team.filter(u => u.is_active).length

  const ROLE_COLORS: Record<string, string> = {
    coordinator: 'text-blue-700 bg-blue-50',
    sales_engineer: 'text-emerald-700 bg-emerald-50',
    installation: 'text-purple-700 bg-purple-50',
    admin: 'text-rose-700 bg-rose-50',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 no-print">
        <StatCard label="إجمالي الفريق" value={team.length} color="bg-gray-50 border-gray-200" />
        <StatCard label="نشطون" value={activeCount} color="bg-emerald-50 border-emerald-200" textColor="text-emerald-700" />
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <StatCard key={role} label={label} value={roleCount[role] ?? 0} color="bg-gray-50 border-gray-200" />
        ))}
      </div>

      <div className="print-only grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="text-center"><p className="font-bold text-2xl">{team.length}</p><p className="text-gray-500">إجمالي</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-emerald-700">{activeCount}</p><p className="text-gray-500">نشطون</p></div>
        <div className="text-center"><p className="font-bold text-2xl text-red-700">{team.length - activeCount}</p><p className="text-gray-500">غير نشطين</p></div>
      </div>

      <ReportTable
        headers={['الاسم', 'الدور', 'الحالة', 'تاريخ الانضمام']}
        rows={team.map(u => [
          <span key="name" className="font-medium text-gray-900">{u.full_name}</span>,
          <StatusPill key="role" label={ROLE_LABELS[u.role] ?? u.role} colorClass={ROLE_COLORS[u.role] ?? 'text-gray-700 bg-gray-100'} />,
          <StatusPill key="active" label={u.is_active ? 'نشط' : 'غير نشط'} colorClass={u.is_active ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'} />,
          formatDateShort(u.created_at),
        ])}
        empty="لا يوجد أعضاء فريق"
      />
    </div>
  )
}

/* ══════════════════════════════════════
   Activity Log
══════════════════════════════════════ */
function ActivityLogTable({ activity }: { activity: ActivityLogReport[] }) {
  return (
    <div className="space-y-5">
      <div className="no-print rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-600">
        يعرض آخر {activity.length} إجراء في النظام
      </div>
      <div className="print-only text-sm text-gray-500 mb-3">
        سجل النشاطات — آخر {activity.length} إجراء
      </div>

      <ReportTable
        headers={['التاريخ والوقت', 'المستخدم', 'المشروع', 'الإجراء']}
        rows={activity.map(log => [
          <span key="date" className="text-xs text-gray-500 whitespace-nowrap">
            {new Date(log.created_at).toLocaleDateString('ar-SA-u-nu-latn', {
              year: 'numeric', month: '2-digit', day: '2-digit',
            })}
            {' '}
            {new Date(log.created_at).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
          </span>,
          log.user?.full_name ?? '—',
          log.project ? (
            <span key="project" className="text-xs">
              <span className="font-medium text-gray-800">{log.project.project_name}</span>
              <span className="text-gray-400 ms-1">({log.project.client_name})</span>
            </span>
          ) : '—',
          <span key="action" className="text-gray-700">{log.action}</span>,
        ])}
        empty="لا يوجد سجل نشاطات"
      />
    </div>
  )
}

/* ══════════════════════════════════════
   Shared sub-components
══════════════════════════════════════ */
function StatCard({
  label, value, color, textColor = 'text-gray-900', isText = false,
}: { label: string; value: string | number; color: string; textColor?: string; isText?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold ${isText ? 'text-base leading-snug' : 'text-2xl'} ${textColor}`}>{value}</p>
    </div>
  )
}

function StatusPill({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

function ReportTable({ headers, rows, empty }: {
  headers: string[]
  rows: (React.ReactNode | string)[][]
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
        {empty}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-700 text-white">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-right font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-brand-50/30 transition-colors`}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-700 align-middle">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
