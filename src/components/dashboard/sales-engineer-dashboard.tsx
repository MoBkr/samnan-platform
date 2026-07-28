import Link from 'next/link'
import { FolderKanban, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { CollapsibleSection } from '@/components/dashboard/collapsible-section'
import { RevenueBreakdownCard } from '@/components/dashboard/revenue-breakdown-card'
import { formatCurrency } from '@/lib/utils'
import type { Profile, Project } from '@/types/database'

interface SalesEngineerDashboardProps {
  profile: Profile
  projects: Project[]
}

export function SalesEngineerDashboard({ profile, projects }: SalesEngineerDashboardProps) {
  const active = projects.filter((p) => p.status === 'active')
  const completed = projects.filter((p) => p.status === 'completed')

  return (
    <div className="space-y-5">
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
        {/* Same card + rule as the coordinator dashboard:
            headline counts active + on_hold only, breakdown shows the rest as غير محتسبة */}
        <RevenueBreakdownCard
          projects={projects}
          label="إجمالي قيمة المشاريع"
          iconBg="bg-green-50 text-green-700"
        />
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{completed.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">مكتمل</p>
        </div>
      </div>

      {/* Projects — collapsible, open by default */}
      <CollapsibleSection
        title="مشاريعي"
        icon={<FolderKanban className="h-5 w-5" />}
        iconBg="bg-green-50 text-green-700"
        count={projects.length}
        defaultOpen
      >
        {projects.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <FolderKanban className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">لا توجد مشاريع بعد</p>
            <p className="text-xs text-gray-400 mt-1">ستظهر مشاريعك هنا عند إضافتها</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {projects.slice(0, 10).map((project) => (
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
            {projects.length > 10 && (
              <Link href="/projects" className="flex items-center justify-center gap-1 border-t border-gray-50 px-5 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50/40 transition-colors">
                عرض جميع المشاريع ({projects.length})
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        )}
      </CollapsibleSection>
    </div>
  )
}
