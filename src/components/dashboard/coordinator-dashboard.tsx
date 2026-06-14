'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FolderKanban, AlertTriangle, Hammer,
  Plus, CheckCircle2, ArrowLeft, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { RevenueBreakdownCard } from '@/components/dashboard/revenue-breakdown-card'
import { CollapsibleSection } from '@/components/dashboard/collapsible-section'
import { ProgressOverview } from '@/components/dashboard/progress-overview'
import { ActionCenter, type ActionItem } from '@/components/dashboard/action-center'
import { ProjectTasks } from '@/components/dashboard/project-tasks'
import { TeamOverview } from '@/components/dashboard/team-overview'
import { FileBarChart2, ClipboardList, Users } from 'lucide-react'
import type { PaymentLite, MaterialLite, InstallationLite } from '@/components/dashboard/progress-overview'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { PAYMENT_TYPE_LABELS } from '@/lib/constants'
import type { Profile, Project, Payment, Installation } from '@/types/database'

interface CoordinatorDashboardProps {
  profile: Profile
  myProjects: Project[]
  allProjects: Project[]
  overduePayments: (Payment & { project: { id: string; client_name: string; project_name: string } })[]
  installations: (Installation & { project: { id: string; client_name: string; project_name: string } })[]
  payments: PaymentLite[]
  materials: MaterialLite[]
  installationsLite: InstallationLite[]
  users: Profile[]
}

type Scope = 'mine' | 'all'

export function CoordinatorDashboard({
  profile,
  myProjects,
  allProjects,
  overduePayments,
  installations,
  payments,
  materials,
  installationsLite,
  users,
}: CoordinatorDashboardProps) {
  const [scope, setScope] = useState<Scope>('mine')

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'
  const dayName = now.toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayStr = now.toISOString().split('T')[0]

  // ── Scope-aware data ──
  const isMine = scope === 'mine'
  const projects = isMine ? myProjects : allProjects
  const ids = new Set(projects.map((p) => p.id))

  const scopedOverdue = overduePayments.filter((op) => ids.has(op.project.id))
  const scopedInstalls = installations.filter((i) => ids.has(i.project_id))
  const todayInstallations = scopedInstalls.filter((i) => i.scheduled_date === todayStr)
  const upcomingInstallations = scopedInstalls.filter((i) => i.scheduled_date && i.scheduled_date > todayStr)

  const activeProjects = projects.filter((p) => p.status === 'active')
  const completedCount = projects.filter((p) => p.status === 'completed').length
  const awaitingConfirmation = scopedInstalls.filter((i) => !i.installation_team_confirmed && i.status !== 'completed')

  const actionItems: ActionItem[] = [
    {
      href: '/payments',
      icon: <AlertTriangle className="h-6 w-6" />,
      count: scopedOverdue.length,
      label: 'مدفوعات متأخرة',
      desc: 'تحتاج تحصيل من العملاء',
      tone: 'red',
    },
    {
      href: '/installation',
      icon: <Hammer className="h-6 w-6" />,
      count: todayInstallations.length,
      label: 'تركيب اليوم',
      desc: 'مجدولة لليوم — تابع التنفيذ',
      tone: 'emerald',
    },
    {
      href: '/installation',
      icon: <Hammer className="h-6 w-6" />,
      count: awaitingConfirmation.length,
      label: 'بانتظار التأكيد',
      desc: 'تركيبات تنتظر تأكيد الموعد',
      tone: 'amber',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-brand-700 to-brand-800 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -left-8 h-48 w-48 rounded-full bg-white blur-2xl" />
          <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-blue-300 blur-xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-brand-200 text-sm font-medium">{greeting}،</p>
            <h1 className="text-2xl font-bold mt-1">{profile.full_name}</h1>
            <p className="text-blue-300 text-sm mt-1">{dayName}</p>
          </div>
          <Link href="/projects/new">
            <Button variant="secondary" className="gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold">
              <Plus className="h-4 w-4" />
              مشروع جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* Reports & printing quick access */}
      <Link href="/reports">
        <div className="flex items-center justify-between rounded-2xl bg-teal-600 px-6 py-4 shadow-sm hover:bg-teal-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <FileBarChart2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">التقارير والطباعة</p>
              <p className="text-xs text-teal-200">تصدير وطباعة تقارير المشاريع والمدفوعات</p>
            </div>
          </div>
          <ArrowLeft className="h-5 w-5 text-teal-200" />
        </div>
      </Link>

      {/* Scope toggle */}
      <ScopeToggle scope={scope} setScope={setScope} mineCount={myProjects.length} allCount={allProjects.length} />

      {/* Action center — what needs doing now */}
      <ActionCenter items={actionItems} />

      {/* KPI stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          href="/projects"
          icon={<FolderKanban className="h-6 w-6" />}
          iconBg="bg-blue-100 text-blue-700"
          value={activeProjects.length}
          label={isMine ? 'مشاريعي النشطة' : 'المشاريع النشطة'}
          sub={`${completedCount} مكتمل`}
        />
        <StatsCard
          href="/payments"
          icon={<AlertTriangle className="h-6 w-6" />}
          iconBg="bg-red-100 text-red-700"
          value={scopedOverdue.length}
          label="مدفوعات متأخرة"
          sub={scopedOverdue.length > 0 ? 'تحتاج متابعة' : 'لا توجد متأخرات'}
          urgent={scopedOverdue.length > 0}
        />
        <StatsCard
          href="/installation"
          icon={<Hammer className="h-6 w-6" />}
          iconBg="bg-emerald-100 text-emerald-700"
          value={todayInstallations.length}
          label="تركيب اليوم"
          sub={`${upcomingInstallations.length} قادم`}
        />
        <RevenueBreakdownCard
          projects={projects}
          label={isMine ? 'إجمالي قيمة مشاريعي' : 'إجمالي قيمة المشاريع'}
          iconBg="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Insights */}
      <ProgressOverview
        projects={projects}
        payments={payments}
        materials={materials}
        installations={installationsLite}
        overdueAmount={scopedOverdue.reduce((s, p) => s + (p.amount - p.paid_amount), 0)}
      />

      {/* Per-project stage + next action */}
      <CollapsibleSection
        title="حالة ومهام المشاريع"
        icon={<ClipboardList className="h-5 w-5" />}
        iconBg="bg-brand-100 text-brand-700"
        count={activeProjects.length}
        defaultOpen
      >
        <ProjectTasks
          projects={activeProjects}
          payments={payments}
          materials={materials}
          installations={installations.map((i) => ({ project_id: i.project_id, status: i.status, installation_team_confirmed: i.installation_team_confirmed }))}
          overdueProjectIds={new Set(scopedOverdue.map((op) => op.project.id))}
        />
        {activeProjects.length > 8 && <ViewAllFooter href="/projects" label="عرض كل المشاريع" />}
      </CollapsibleSection>

      {/* Today's installations — time-sensitive */}
      {todayInstallations.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
              <Hammer className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-900">
                {todayInstallations.length === 1 ? 'يوجد تركيب مجدول اليوم' : `يوجد ${todayInstallations.length} تركيبات مجدولة اليوم`}
              </p>
              <ul className="mt-2 space-y-1">
                {todayInstallations.map((inst) => (
                  <li key={inst.id} className="text-sm text-emerald-800 flex flex-wrap items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-emerald-600" />
                    {inst.project.project_name} — {inst.project.client_name}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inst.installation_team_confirmed ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {inst.installation_team_confirmed ? 'مؤكد' : 'في انتظار التأكيد'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/installation">
              <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 shrink-0">
                إدارة
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Overdue payments — scoped */}
      <CollapsibleSection
        title="المدفوعات المتأخرة"
        icon={<Wallet className="h-5 w-5" />}
        iconBg="bg-red-100 text-red-700"
        count={scopedOverdue.length}
        urgent={scopedOverdue.length > 0}
        defaultOpen={scopedOverdue.length > 0}
      >
        {scopedOverdue.length === 0 ? (
          <EmptyRow icon={<CheckCircle2 className="h-6 w-6 text-green-500" />} iconBg="bg-green-50"
            title="لا توجد مدفوعات متأخرة" sub="جميع المدفوعات في موعدها" />
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {scopedOverdue.slice(0, 6).map((payment) => (
                <li key={payment.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{payment.project.project_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {PAYMENT_TYPE_LABELS[payment.type]}
                        {payment.due_date && ` — استحق ${formatDateShort(payment.due_date)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-bold text-red-600">{formatCurrency(payment.amount - payment.paid_amount)}</span>
                      <Link href={`/projects/${payment.project.id}`} className="text-xs text-blue-600 hover:underline font-medium">متابعة</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <ViewAllFooter href="/payments" label="عرض جميع المدفوعات" />
          </>
        )}
      </CollapsibleSection>

      {/* Active projects — scoped, open */}
      <CollapsibleSection
        title={isMine ? 'مشاريعي النشطة' : 'المشاريع النشطة'}
        icon={<FolderKanban className="h-5 w-5" />}
        iconBg="bg-brand-100 text-brand-700"
        count={activeProjects.length}
        defaultOpen
      >
        {activeProjects.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <FolderKanban className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">لا توجد مشاريع نشطة</p>
            <Link href="/projects/new">
              <Button size="sm" variant="outline" className="mt-3 gap-1">
                <Plus className="h-3.5 w-3.5" />
                مشروع جديد
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {activeProjects.slice(0, 6).map((project) => (
                <ProjectRow key={project.id} project={project} mineTag={!isMine && project.coordinator_id === profile.id} />
              ))}
            </ul>
            <ViewAllFooter href="/projects" label="عرض المشاريع" />
          </>
        )}
      </CollapsibleSection>

      {/* All projects in scope — closed */}
      <CollapsibleSection
        title={isMine ? 'كل مشاريعي' : 'كل المشاريع'}
        icon={<FolderKanban className="h-5 w-5" />}
        iconBg="bg-gray-100 text-gray-600"
        count={projects.length}
      >
        {projects.length === 0 ? (
          <EmptyRow icon={<FolderKanban className="h-6 w-6 text-gray-300" />} iconBg="bg-gray-50" title="لا توجد مشاريع" />
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {projects.slice(0, 10).map((project) => (
                <ProjectRow key={project.id} project={project} mineTag={!isMine && project.coordinator_id === profile.id} />
              ))}
            </ul>
            <ViewAllFooter href="/projects" label={`عرض جميع المشاريع (${projects.length})`} />
          </>
        )}
      </CollapsibleSection>

      {/* Team & workload — always all team members (uses all projects for accurate load) */}
      <CollapsibleSection
        title="الفريق وتوزيع المشاريع"
        icon={<Users className="h-5 w-5" />}
        iconBg="bg-indigo-100 text-indigo-700"
        count={users.filter((u) => u.role !== 'admin').length}
      >
        <TeamOverview users={users} projects={allProjects} />
      </CollapsibleSection>
    </div>
  )
}

/* ── Scope toggle ── */
function ScopeToggle({ scope, setScope, mineCount, allCount }: { scope: Scope; setScope: (s: Scope) => void; mineCount: number; allCount: number }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
      {([['mine', 'مشاريعي', mineCount], ['all', 'كل المشاريع', allCount]] as const).map(([val, label, count]) => (
        <button
          key={val}
          onClick={() => setScope(val)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            scope === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {label}
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
            scope === val ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'
          )}>
            {count}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ── Shared rows ── */
function ProjectRow({ project, mineTag }: { project: Project; mineTag?: boolean }) {
  return (
    <li className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{project.project_name}</p>
            {mineTag && (
              <span className="shrink-0 text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-md font-medium">مشروعي</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {project.client_name}
            {project.total_amount ? ` — ${formatCurrency(project.total_amount)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <Link href={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline font-medium">عرض</Link>
        </div>
      </div>
    </li>
  )
}

function ViewAllFooter({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-center gap-1 border-t border-gray-50 px-5 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50/40 transition-colors">
      {label}
      <ArrowLeft className="h-3.5 w-3.5" />
    </Link>
  )
}

function EmptyRow({ icon, iconBg, title, sub }: { icon: React.ReactNode; iconBg: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

interface StatsCardProps {
  href: string
  icon: React.ReactNode
  iconBg: string
  value: number
  label: string
  sub?: string
  urgent?: boolean
}

function StatsCard({ href, icon, iconBg, value, label, sub, urgent }: StatsCardProps) {
  return (
    <Link href={href}>
      <div className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${urgent ? 'border-red-200' : 'border-gray-100'}`}>
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className={`text-xs mt-1 ${urgent ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{sub}</p>}
      </div>
    </Link>
  )
}
