import Link from 'next/link'
import { FolderKanban, AlertTriangle, Users, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils'
import type { Profile, Project, Payment } from '@/types/database'

interface AdminDashboardProps {
  profile: Profile
  projects: Project[]
  overduePayments: (Payment & { project: { id: string; client_name: string; project_name: string } })[]
  users: Profile[]
}

export function AdminDashboard({ projects, overduePayments, users }: AdminDashboardProps) {
  const activeProjects = projects.filter((p) => p.status === 'active')
  const totalRevenue = projects.reduce((sum, p) => sum + (p.total_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة الإدارة</h1>
        <p className="text-sm text-gray-500">نظرة شاملة على النظام</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/projects">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <FolderKanban className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProjects.length}</p>
                <p className="text-sm text-gray-500">مشاريع نشطة</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-gray-500">إجمالي القيمة</p>
            </div>
          </CardContent>
        </Card>
        <Link href="/payments">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overduePayments.length}</p>
                <p className="text-sm text-gray-500">مدفوعات متأخرة</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/users">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-gray-500">المستخدمون</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <h2 className="font-semibold">جميع المشاريع</h2>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">عرض الكل</Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {projects.slice(0, 8).map((project) => (
              <li key={project.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.project_name}</p>
                  <p className="text-xs text-gray-500">{project.client_name} — {formatCurrency(project.total_amount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ProjectStatusBadge status={project.status} />
                  <Link href={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline">عرض</Link>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
