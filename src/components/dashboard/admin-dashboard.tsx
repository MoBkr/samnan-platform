import Link from 'next/link'
import { FolderKanban, AlertTriangle, Users, ArrowLeft, FileBarChart2, Wallet, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { RevenueBreakdownCard } from '@/components/dashboard/revenue-breakdown-card'
import { CollapsibleSection } from '@/components/dashboard/collapsible-section'
import { formatCurrency } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile, Project, Payment } from '@/types/database'

interface AdminDashboardProps {
  profile: Profile
  projects: Project[]
  overduePayments: (Payment & { project: { id: string; client_name: string; project_name: string } })[]
  users: Profile[]
}

export function AdminDashboard({ profile, projects, overduePayments, users }: AdminDashboardProps) {
  const activeProjects = projects.filter((p) => p.status === 'active')
  const completedProjects = projects.filter((p) => p.status === 'completed')
  const overdueValue = overduePayments.reduce((s, p) => s + (p.amount - p.paid_amount), 0)

  const VISIBLE_ROLES = ['coordinator', 'sales_engineer', 'installation', 'admin']
  const roleCount = users.reduce<Record<string, number>>((acc, u) => {
    if (!VISIBLE_ROLES.includes(u.role)) return acc
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-brand-800 to-brand-900 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -left-8 h-48 w-48 rounded-full bg-blue-400 blur-2xl" />
          <div className="absolute bottom-0 right-10 h-32 w-32 rounded-full bg-indigo-500 blur-xl" />
        </div>
        <div className="relative z-10">
          <p className="text-slate-400 text-sm">لوحة الإدارة العليا</p>
          <h1 className="text-2xl font-bold mt-1">مرحباً، {profile.full_name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {projects.length} مشروع إجمالي — {activeProjects.length} نشط — {completedProjects.length} مكتمل
          </p>
        </div>
      </div>

      {/* Reports quick-access banner */}
      <Link href="/reports">
        <div className="flex items-center justify-between rounded-2xl bg-teal-600 px-6 py-4 shadow-sm hover:bg-teal-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <FileBarChart2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">التقارير والطباعة</p>
              <p className="text-xs text-teal-200">تصدير تقارير المشاريع والمدفوعات بصيغة PDF</p>
            </div>
          </div>
          <ArrowLeft className="h-5 w-5 text-teal-200" />
        </div>
      </Link>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          href="/projects"
          icon={<FolderKanban className="h-6 w-6" />}
          bg="bg-blue-50 text-blue-700"
          value={activeProjects.length}
          label="مشاريع نشطة"
        />
        <RevenueBreakdownCard projects={projects} label="إجمالي القيمة" />
        <KpiCard
          href="/payments"
          icon={<AlertTriangle className="h-6 w-6" />}
          bg="bg-red-50 text-red-700"
          value={overduePayments.length}
          label="مدفوعات متأخرة"
          sub={overduePayments.length > 0 ? `متأخر: ${overdueValue.toLocaleString('en')} ريال` : undefined}
          urgent={overduePayments.length > 0}
        />
        <KpiCard
          href="/users"
          icon={<Users className="h-6 w-6" />}
          bg="bg-purple-50 text-purple-700"
          value={users.length}
          label="المستخدمون"
        />
      </div>

      {/* Overdue payments — collapsible, urgent */}
      <CollapsibleSection
        title="المدفوعات المتأخرة"
        icon={<Wallet className="h-5 w-5" />}
        iconBg="bg-red-100 text-red-700"
        count={overduePayments.length}
        urgent={overduePayments.length > 0}
        defaultOpen={overduePayments.length > 0}
      >
        {overduePayments.length === 0 ? (
          <EmptyRow icon={<CheckCircle2 className="h-6 w-6 text-green-500" />} iconBg="bg-green-50"
            title="لا توجد مدفوعات متأخرة" sub="جميع المدفوعات في موعدها" />
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {overduePayments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.project.project_name}</p>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-red-600">{formatCurrency(p.amount - p.paid_amount)}</span>
                    <Link href={`/projects/${p.project.id}`} className="text-xs text-blue-600 hover:underline font-medium">متابعة</Link>
                  </div>
                </li>
              ))}
            </ul>
            <ViewAllFooter href="/payments" label="عرض جميع المتأخرات" />
          </>
        )}
      </CollapsibleSection>

      {/* All projects — collapsible, open */}
      <CollapsibleSection
        title="جميع المشاريع"
        icon={<FolderKanban className="h-5 w-5" />}
        iconBg="bg-blue-50 text-blue-700"
        count={projects.length}
        defaultOpen
      >
        {projects.length === 0 ? (
          <EmptyRow icon={<FolderKanban className="h-6 w-6 text-gray-300" />} iconBg="bg-gray-50" title="لا توجد مشاريع" />
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {projects.slice(0, 8).map((project) => (
                <li key={project.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{project.project_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{project.client_name} — {formatCurrency(project.total_amount)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ProjectStatusBadge status={project.status} />
                    <Link href={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline">عرض</Link>
                  </div>
                </li>
              ))}
            </ul>
            <ViewAllFooter href="/projects" label={`عرض جميع المشاريع (${projects.length})`} />
          </>
        )}
      </CollapsibleSection>

      {/* Team breakdown — collapsible, closed */}
      <CollapsibleSection
        title="الفريق"
        icon={<Users className="h-5 w-5" />}
        iconBg="bg-purple-50 text-purple-700"
        count={users.length}
      >
        <div className="p-5 space-y-3">
          {Object.entries(roleCount).map(([role, count]) => (
            <div key={role} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-2.5 w-2.5 rounded-full ${ROLE_DOT[role] ?? 'bg-gray-400'}`} />
                <span className="text-sm text-gray-700">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</span>
              </div>
              <Badge variant="secondary" className="text-xs font-bold">{count}</Badge>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا يوجد مستخدمون</p>}
        </div>
        <ViewAllFooter href="/users" label="إدارة المستخدمين" />
      </CollapsibleSection>
    </div>
  )
}

const ROLE_DOT: Record<string, string> = {
  coordinator: 'bg-blue-500',
  sales_engineer: 'bg-green-500',
  installation: 'bg-purple-500',
  admin: 'bg-rose-500',
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

interface KpiCardProps {
  href: string
  icon: React.ReactNode
  bg: string
  value: number | string
  label: string
  sub?: string
  urgent?: boolean
}

function KpiCard({ href, icon, bg, value, label, sub, urgent }: KpiCardProps) {
  return (
    <Link href={href}>
      <div className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${urgent ? 'border-red-200' : 'border-gray-100'}`}>
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className={`text-xs mt-1 font-medium ${urgent ? 'text-red-500' : 'text-gray-400'}`}>{sub}</p>}
      </div>
    </Link>
  )
}
