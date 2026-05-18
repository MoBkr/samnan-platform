import Link from 'next/link'
import {
  FolderKanban, AlertTriangle, Hammer,
  Plus, CheckCircle2, ArrowLeft, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { RevenueBreakdownCard } from '@/components/dashboard/revenue-breakdown-card'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { PAYMENT_TYPE_LABELS } from '@/lib/constants'
import type { Profile, Project, Payment, Installation } from '@/types/database'

interface CoordinatorDashboardProps {
  profile: Profile
  myProjects: Project[]
  allProjects: Project[]
  overduePayments: (Payment & { project: { id: string; client_name: string; project_name: string } })[]
  installations: (Installation & { project: { id: string; client_name: string; project_name: string } })[]
}

export function CoordinatorDashboard({
  profile,
  myProjects,
  allProjects,
  overduePayments,
  installations,
}: CoordinatorDashboardProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todayInstallations = installations.filter((i) => i.scheduled_date === todayStr)
  const upcomingInstallations = installations.filter((i) => i.scheduled_date && i.scheduled_date > todayStr)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'
  const dayName = now.toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const myActiveProjects = myProjects.filter(p => p.status === 'active')
  const myCompletedCount = myProjects.filter(p => p.status === 'completed').length
  const myOverduePayments = overduePayments.filter(op =>
    myProjects.some(p => p.id === op.project.id)
  )

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

      {/* ── My Projects Section ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
            <FolderKanban className="h-4 w-4 text-brand-700" />
          </div>
          <h2 className="text-base font-bold text-gray-900">مشاريعي</h2>
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            {myProjects.length}
          </span>
        </div>

        {/* My stats grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            href="/projects?tab=mine"
            icon={<FolderKanban className="h-6 w-6" />}
            iconBg="bg-blue-100 text-blue-700"
            value={myActiveProjects.length}
            label="مشاريع نشطة"
            sub={`${myCompletedCount} مكتمل`}
          />
          <StatsCard
            href="/payments"
            icon={<AlertTriangle className="h-6 w-6" />}
            iconBg="bg-red-100 text-red-700"
            value={myOverduePayments.length}
            label="مدفوعات متأخرة"
            sub={myOverduePayments.length > 0 ? 'تحتاج متابعة' : 'لا توجد متأخرات'}
            urgent={myOverduePayments.length > 0}
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
            projects={myProjects}
            label="إجمالي قيمة مشاريعي"
            iconBg="bg-purple-100 text-purple-700"
          />
        </div>

        {/* My overdue + my active lists */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overdue payments */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">المدفوعات المتأخرة</h3>
                {myOverduePayments.length > 0 && (
                  <Badge variant="danger" className="text-xs">{myOverduePayments.length}</Badge>
                )}
              </div>
              <Link href="/payments" className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                عرض الكل
                <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            {myOverduePayments.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">لا توجد مدفوعات متأخرة</p>
                <p className="text-xs text-gray-400 mt-1">جميع المدفوعات في موعدها</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {myOverduePayments.slice(0, 5).map((payment) => (
                  <li key={payment.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {payment.project.project_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {PAYMENT_TYPE_LABELS[payment.type]}
                          {payment.due_date && ` — استحق ${formatDateShort(payment.due_date)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-sm font-bold text-red-600">
                          {formatCurrency(payment.amount - payment.paid_amount)}
                        </span>
                        <Link href={`/projects/${payment.project.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium">
                          متابعة
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* My active projects */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
              <h3 className="font-semibold text-gray-900">مشاريعي النشطة</h3>
              <Link href="/projects?tab=mine" className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                عرض الكل
                <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            {myActiveProjects.length === 0 ? (
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
              <ul className="divide-y divide-gray-50">
                {myActiveProjects.slice(0, 5).map((project) => (
                  <li key={project.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{project.project_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{project.client_name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ProjectStatusBadge status={project.status} />
                        <Link href={`/projects/${project.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium">
                          عرض
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Today's installations alert */}
        {todayInstallations.length > 0 && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
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
                    <li key={inst.id} className="text-sm text-emerald-800 flex items-center gap-2">
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
      </section>

      {/* ── All Projects Section (read-only) ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
            <Eye className="h-4 w-4 text-gray-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">كل المشاريع</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {allProjects.length}
          </span>
          <span className="text-xs text-gray-400">— استعراض فقط</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {allProjects.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                <FolderKanban className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">لا توجد مشاريع</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {allProjects.slice(0, 10).map((project) => (
                <li key={project.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{project.project_name}</p>
                        {project.coordinator_id === profile.id && (
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
                      <Link href={`/projects/${project.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium">
                        عرض
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
              {allProjects.length > 10 && (
                <li className="px-5 py-3 text-center">
                  <Link href="/projects" className="text-sm text-blue-600 hover:underline font-medium">
                    عرض جميع المشاريع ({allProjects.length})
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </section>
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
