import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">مرحباً، {profile.full_name}</h1>
        <p className="text-sm text-gray-500">مشاريعي</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <FolderKanban className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{active.length}</p>
            <p className="text-sm text-gray-500">مشاريع نشطة</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-semibold">مشاريعي</h2>
          </div>
          {projects.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">لا توجد مشاريع مضافة بعد</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.project_name}</p>
                    <p className="text-xs text-gray-500">{project.client_name} — {formatCurrency(project.total_amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProjectStatusBadge status={project.status} />
                    <Link href={`/projects/${project.id}`}>
                      <Button size="sm" variant="outline">عرض</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
