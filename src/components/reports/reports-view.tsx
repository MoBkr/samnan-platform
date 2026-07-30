'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/shared/print-header'
import { formatCurrency, formatDateShort, cn } from '@/lib/utils'
import { ROLE_LABELS, STATUS_LABELS, PAYMENT_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants'
import type { Profile } from '@/types/database'
import type { ProjectReport, PaymentReport, ActivityLogReport, AnnualSummary } from '@/lib/actions/reports'

type ReportTab = 'annual' | 'projects' | 'payments' | 'team' | 'activity'

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'annual', label: 'الملخص السنوي' },
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
  annual: AnnualSummary
}

export function ReportsView({ projects, payments, team, activity, annual }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('annual')

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? ''
  const printDate = new Date().toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh',
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

      {/* ─── Print letterhead (hidden on screen) ─── */}
      <PrintHeader title={`تقرير ${tabLabel}`} subtitle={`تاريخ الإصدار: ${printDate}`} />

      {/* ─── Report body ─── */}
      {activeTab === 'annual' && <AnnualSummaryReport annual={annual} />}
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
        headers={['المشروع', 'العميل', 'الحالة', 'المبلغ', 'مهندس إدارة المشاريع', 'مهندس المبيعات', 'تاريخ البدء']}
        rows={projects.map(p => [
          <span key="name" className="font-medium text-gray-900">{p.project_name}</span>,
          p.client_name,
          <StatusPill key="status" label={STATUS_LABELS[p.status] ?? p.status} colorClass={STATUS_COLORS[p.status]} />,
          p.total_amount ? formatCurrency(p.total_amount) : '—',
          p.coordinator?.full_name ?? '—',
          p.sales_engineer?.full_name ?? '—',
          p.start_date ? <span key="d" className="font-bold text-brand-800" dir="ltr">{formatDateShort(p.start_date)}</span> : '—',
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
          p.due_date ? <span key="d" className="font-bold text-brand-800" dir="ltr">{formatDateShort(p.due_date)}</span> : '—',
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
          <span key="d" className="font-bold text-brand-800" dir="ltr">{formatDateShort(u.created_at)}</span>,
        ])}
        empty="لا يوجد أعضاء فريق"
      />
    </div>
  )
}

/* ══════════════════════════════════════
   Annual Summary
══════════════════════════════════════ */
function AnnualSummaryReport({ annual }: { annual: AnnualSummary }) {
  const [year, setYear] = useState<number>(annual.years[0] ?? new Date().getFullYear())
  const s = annual.byYear[year] ?? {
    year, projectsCreated: 0, projectsCompleted: 0, projectsCancelled: 0,
    deliveriesConfirmed: 0, installationsCompleted: 0, collected: 0, newContractsValue: 0,
  }

  return (
    <div className="space-y-5">
      {/* Year selector */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600">السنة:</span>
        {annual.years.map((y) => (
          <button key={y} onClick={() => setYear(y)}
            className={cn('rounded-full border px-3.5 py-1 text-sm font-semibold transition-colors',
              y === year ? 'border-brand-300 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300')}>
            {y}
          </button>
        ))}
        <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          نشط الآن: {annual.currentActive}
        </span>
      </div>
      <div className="print-only text-sm text-gray-600 mb-2">الملخص السنوي — {year}</div>

      {/* Project counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <YearStat label="مشاريع أُنشئت" value={s.projectsCreated} tone="blue" />
        <YearStat label="مشاريع اكتملت" value={s.projectsCompleted} tone="green" />
        <YearStat label="مشاريع أُلغيت" value={s.projectsCancelled} tone="red" />
        <YearStat label="تركيبات مكتملة" value={s.installationsCompleted} tone="purple" />
      </div>

      {/* Deliveries + financials */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <YearStat label="عمليات توريد مؤكدة (بمذكرة تسليم)" value={s.deliveriesConfirmed} tone="amber" />
        <YearStat label="المُحصَّل خلال السنة" value={formatCurrency(s.collected)} tone="green" money />
        <YearStat label="قيمة العقود الجديدة" value={formatCurrency(s.newContractsValue)} tone="blue" money />
      </div>

      {/* All years at a glance */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-3 py-2.5 text-start font-semibold">السنة</th>
                <th className="px-3 py-2.5 text-start font-semibold">أُنشئت</th>
                <th className="px-3 py-2.5 text-start font-semibold">اكتملت</th>
                <th className="px-3 py-2.5 text-start font-semibold">أُلغيت</th>
                <th className="px-3 py-2.5 text-start font-semibold">توريدات مؤكدة</th>
                <th className="px-3 py-2.5 text-start font-semibold">تركيبات مكتملة</th>
                <th className="px-3 py-2.5 text-start font-semibold">المُحصَّل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {annual.years.map((y) => {
                const r = annual.byYear[y]
                return (
                  <tr key={y} className={cn('hover:bg-gray-50/50', y === year && 'bg-brand-50/40')}>
                    <td className="px-3 py-2.5 font-bold text-gray-800">{y}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r?.projectsCreated ?? 0}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r?.projectsCompleted ?? 0}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r?.projectsCancelled ?? 0}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r?.deliveriesConfirmed ?? 0}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r?.installationsCompleted ?? 0}</td>
                    <td className="px-3 py-2.5 text-gray-700 font-medium">{formatCurrency(r?.collected ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        ملاحظة: التوريد يُحتسب مؤكداً فقط بعد رفع مذكرة التسليم (Delivery Note). تواريخ الاكتمال/الإلغاء مبنية على آخر تحديث للمشروع.
      </p>
    </div>
  )
}

function YearStat({ label, value, tone, money }: { label: string; value: number | string; tone: 'blue' | 'green' | 'red' | 'amber' | 'purple'; money?: boolean }) {
  const cls = {
    blue: 'border-blue-100 bg-blue-50/60 text-blue-700',
    green: 'border-emerald-100 bg-emerald-50/60 text-emerald-700',
    red: 'border-red-100 bg-red-50/60 text-red-700',
    amber: 'border-amber-100 bg-amber-50/60 text-amber-700',
    purple: 'border-purple-100 bg-purple-50/60 text-purple-700',
  }[tone]
  return (
    <div className={cn('rounded-2xl border p-4 print:break-inside-avoid', cls)}>
      <p className={cn('font-extrabold leading-none', money ? 'text-lg' : 'text-3xl')}>{value}</p>
      <p className="text-xs mt-2 opacity-80">{label}</p>
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
              year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Riyadh',
            })}
            {' '}
            {new Date(log.created_at).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' })}
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
