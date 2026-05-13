import Link from 'next/link'
import { FolderKanban, TrendingUp, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils'
import type { Profile, Project } from '@/types/database'

interface SalesEngineerDashboardProps {
  profile: Profile
  projects: Project[]
}

export function SalesEngineerDashboard({ profile, projects }: SalesEngineerDashboardProps) {
  const active = projects.filter((p) => p.status === 'active')
  const completed = projects.filter((p) => p.status === 'completed')
  const totalRevenue = projects.reduce((s, p) => s + (p.total_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-green-700 to-green-900 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -left-8 h-48 w-48 rounded-full bg-green-300 blur-2xl" />
        </div>
        <div className="relative z-10">
          <p className="text-green-200 text-sm">مهندس المبيعات</p>
          <h1 className="text-2xl font-bold mt-1">مرحباً، {profile.full_name}</h1>
          <p className="text-green-200 text-sm mt-1">
            {projects.length} مشروع — {active.length} نشط — {completed.length} مكتمل
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <FolderKanban className="h-5 w-5 text-blue-700" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{active.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">مشاريع نشطة</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <TrendingUp className="h-5 w-5 text-green-700" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-0.5">إجمالي قيمة المشاريع</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{completed.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">مكتمل</p>
        </div>
      </div>

      {/* Projects list */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
          <h2 className="font-semibold text-gray-900">مشاريعي</h2>
          <Link href="/projects" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            عرض الكل <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <FolderKanban className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">لا توجد مشاريع بعد</p>
            <p className="text-xs text-gray-400 mt-1">ستظهر مشاريعك هنا عند إضافتها</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{project.project_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{project.client_name} — {formatCurrency(project.total_amount)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ProjectStatusBadge status={project.status} />
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8">عرض</Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
