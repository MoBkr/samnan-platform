import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getProjects } from '@/lib/actions/projects'
import { getCurrentProfile } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export default async function ProjectsPage() {
  const [projects, profile] = await Promise.all([getProjects(), getCurrentProfile()])
  const canCreate = profile?.role === 'coordinator' || profile?.role === 'sales_engineer' || profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <PageHeader
        title="المشاريع"
        description={`${projects.length} مشروع`}
        action={
          canCreate ? (
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                مشروع جديد
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المشروع</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>القيمة الإجمالية</TableHead>
              <TableHead>تاريخ البداية</TableHead>
              <TableHead>الكوردنيتر</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableEmpty message="لا توجد مشاريع بعد" />
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium text-gray-900">
                    {project.project_name}
                  </TableCell>
                  <TableCell>{project.client_name}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell>{formatCurrency(project.total_amount)}</TableCell>
                  <TableCell>{formatDateShort(project.start_date)}</TableCell>
                  <TableCell>
                    {project.coordinator?.full_name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="ghost" size="sm">عرض</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {projects.length === 0 && canCreate && (
        <EmptyState
          message="لا توجد مشاريع بعد"
          description="أنشئ مشروعاً جديداً للبدء"
          action={
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                مشروع جديد
              </Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
