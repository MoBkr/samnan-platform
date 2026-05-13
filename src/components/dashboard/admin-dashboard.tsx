import Link from 'next/link'
import { FolderKanban, AlertTriangle, Users, TrendingUp, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
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
  const totalRevenue = projects.reduce((sum, p) => sum + (p.total_amount ?? 0), 0)
  const activeRevenue = activeProjects.reduce((sum, p) => sum + (p.total_amount ?? 0), 0)

  const roleCount = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
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

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          href="/projects"
          icon={<FolderKanban className="h-6 w-6" />}
          bg="bg-blue-50 text-blue-700"
          value={activeProjects.length}
          label="مشاريع نشطة"
        />
        <KpiCard
          href="#"
          icon={<TrendingUp className="h-6 w-6" />}
          bg="bg-emerald-50 text-emerald-700"
          value={formatCurrency(totalRevenue)}
          label="إجمالي القيمة"
          isText
        />
        <KpiCard
          href="/payments"
          icon={<AlertTriangle className="h-6 w-6" />}
          bg="bg-red-50 text-red-700"
          value={overduePayments.length}
          label="مدفوعات متأخرة"
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

      {/* Revenue breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">قيمة المشاريع النشطة</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(activeRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{activeProjects.length} مشروع</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">مشاريع مكتملة</p>
          <p className="text-2xl font-bold text-emerald-700">{completedProjects.length}</p>
          <p className="text-xs text-gray-400 mt-1">{formatCurrency(completedProjects.reduce((s,p) => s + (p.total_amount ?? 0), 0))}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">المتأخرات</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(overduePayments.reduce((s,p) => s + (p.amount - p.paid_amount), 0))}
          </p>
          <p className="text-xs text-gray-400 mt-1">{overduePayments.length} دفعة متأخرة</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects list */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <h2 className="font-semibold text-gray-900">جميع المشاريع</h2>
            <Link href="/projects" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              عرض الكل <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {projects.slice(0, 6).map((project) => (
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
        </div>

        {/* Users breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <h2 className="font-semibold text-gray-900">الفريق</h2>
            <Link href="/users" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              إدارة <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
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
            {users.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">لا يوجد مستخدمون</p>
            )}
          </div>

          {/* Overdue alert */}
          {overduePayments.length > 0 && (
            <div className="mx-4 mb-4 rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm font-semibold text-red-800">مدفوعات تحتاج متابعة</p>
              </div>
              <ul className="space-y-1">
                {overduePayments.slice(0, 3).map((p) => (
                  <li key={p.id} className="text-xs text-red-700 flex justify-between">
                    <span className="truncate">{p.project.project_name}</span>
                    <span className="font-semibold shrink-0 mr-2">{formatCurrency(p.amount - p.paid_amount)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/payments">
                <button className="mt-3 text-xs font-semibold text-red-600 hover:underline flex items-center gap-1">
                  عرض جميع المتأخرات <ArrowLeft className="h-3 w-3" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ROLE_DOT: Record<string, string> = {
  coordinator: 'bg-blue-500',
  sales_engineer: 'bg-green-500',
  supply: 'bg-amber-500',
  installation: 'bg-purple-500',
  admin: 'bg-rose-500',
}

interface KpiCardProps {
  href: string
  icon: React.ReactNode
  bg: string
  value: number | string
  label: string
  isText?: boolean
  urgent?: boolean
}

function KpiCard({ href, icon, bg, value, label, isText, urgent }: KpiCardProps) {
  return (
    <Link href={href}>
      <div className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${urgent ? 'border-red-200' : 'border-gray-100'}`}>
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <p className={`font-bold text-gray-900 ${isText ? 'text-xl' : 'text-3xl'}`}>{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </Link>
  )
}
