import Link from 'next/link'
import { FolderKanban, AlertTriangle, Package, Hammer, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { PAYMENT_TYPE_LABELS } from '@/lib/constants'
import type { Profile, Project, Payment, Material, Installation } from '@/types/database'

interface CoordinatorDashboardProps {
  profile: Profile
  activeProjects: Project[]
  overduePayments: (Payment & { project: { id: string; client_name: string; project_name: string } })[]
  pendingMaterials: (Material & { project: { id: string; client_name: string; project_name: string } })[]
  installations: (Installation & { project: { id: string; client_name: string; project_name: string } })[]
}

export function CoordinatorDashboard({
  profile,
  activeProjects,
  overduePayments,
  pendingMaterials,
  installations,
}: CoordinatorDashboardProps) {
  const todayInstallations = installations.filter(
    (i) => i.scheduled_date === new Date().toISOString().split('T')[0]
  )

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مرحباً، {profile.full_name}</h1>
          <p className="text-sm text-gray-500">نظرة عامة على المشاريع النشطة</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            مشروع جديد
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FolderKanban className="h-6 w-6 text-blue-600" />}
          label="مشاريع نشطة"
          value={activeProjects.length}
          bg="bg-blue-50"
          link="/projects"
        />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          label="مدفوعات متأخرة"
          value={overduePayments.length}
          bg="bg-red-50"
          link="/payments"
        />
        <StatCard
          icon={<Package className="h-6 w-6 text-amber-600" />}
          label="طلبات مواد معلقة"
          value={pendingMaterials.length}
          bg="bg-amber-50"
          link="/supply"
        />
        <StatCard
          icon={<Hammer className="h-6 w-6 text-green-600" />}
          label="تركيب اليوم"
          value={todayInstallations.length}
          bg="bg-green-50"
          link="/installation"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue payments */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-100 p-4">
              <h2 className="font-semibold text-gray-900">المدفوعات المتأخرة</h2>
            </div>
            {overduePayments.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">لا توجد مدفوعات متأخرة ✓</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {overduePayments.slice(0, 5).map((payment) => (
                  <li key={payment.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {payment.project.project_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {PAYMENT_TYPE_LABELS[payment.type]} — استحق {formatDateShort(payment.due_date)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(payment.amount - payment.paid_amount)}</span>
                        <Link href={`/projects/${payment.project.id}`} className="text-xs text-blue-600 hover:underline">عرض</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Active projects */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h2 className="font-semibold text-gray-900">المشاريع النشطة</h2>
              <Link href="/projects" className="text-xs text-blue-600 hover:underline">عرض الكل</Link>
            </div>
            {activeProjects.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">لا توجد مشاريع نشطة</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {activeProjects.slice(0, 5).map((project) => (
                  <li key={project.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{project.project_name}</p>
                        <p className="text-xs text-gray-500">{project.client_name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ProjectStatusBadge status={project.status} />
                        <Link href={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline">عرض</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, bg, link,
}: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
  link: string
}) {
  return (
    <Link href={link}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
