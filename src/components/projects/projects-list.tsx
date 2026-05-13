'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Profile } from '@/types/database'

interface ProjectsListProps {
  projects: Project[]
  myProjectIds: Set<string>
  currentProfile: Profile
  canCreate: boolean
}

type View = 'mine' | 'all'

export function ProjectsList({ projects, myProjectIds, currentProfile, canCreate }: ProjectsListProps) {
  const isAdmin = currentProfile.role === 'admin'
  const [view, setView] = useState<View>('mine')

  const myProjects = projects.filter((p) => myProjectIds.has(p.id))
  const displayed = isAdmin ? projects : view === 'mine' ? myProjects : projects

  const myCount = myProjects.length
  const allCount = projects.length

  return (
    <div className="space-y-5">
      {/* Tab switcher — hidden for admin (always shows all) */}
      {!isAdmin && (
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          <button
            onClick={() => setView('mine')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              view === 'mine'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            مشاريعي
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
              view === 'mine' ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'
            )}>
              {myCount}
            </span>
          </button>
          <button
            onClick={() => setView('all')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              view === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            كل المشاريع
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
              view === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'
            )}>
              {allCount}
            </span>
          </button>
        </div>
      )}

      {/* Table */}
      {displayed.length === 0 ? (
        <EmptyState
          message={view === 'mine' ? 'لا توجد مشاريع مخصصة لك' : 'لا توجد مشاريع بعد'}
          description={
            view === 'mine'
              ? 'ستظهر هنا المشاريع التي أنت مسؤول عنها'
              : canCreate
              ? 'أنشئ مشروعاً جديداً للبدء'
              : undefined
          }
          icon={<FolderOpen className="h-8 w-8 text-gray-400" />}
          action={
            view === 'mine' ? (
              <Button variant="outline" size="sm" onClick={() => setView('all')}>
                عرض كل المشاريع
              </Button>
            ) : canCreate ? (
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  مشروع جديد
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
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
              {displayed.length === 0 ? (
                <TableEmpty message="لا توجد مشاريع" />
              ) : (
                displayed.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {project.project_name}
                        {!isAdmin && view === 'all' && myProjectIds.has(project.id) && (
                          <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-100">
                            مشروعي
                          </span>
                        )}
                      </div>
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
      )}
    </div>
  )
}
