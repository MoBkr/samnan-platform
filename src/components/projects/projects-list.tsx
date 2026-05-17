'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, FolderOpen, Building2, Calendar, DollarSign, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
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
      {/* Tab switcher — hidden for admin */}
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

      {/* Cards grid */}
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayed.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isMine={myProjectIds.has(project.id)}
              showMineTag={!isAdmin && view === 'all'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  isMine,
  showMineTag,
}: {
  project: Project
  isMine: boolean
  showMineTag: boolean
}) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <div className="flex flex-col h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
              {project.project_name}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{project.client_name}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <ProjectStatusBadge status={project.status} />
            {showMineTag && isMine && (
              <span className="rounded-full bg-brand-50 border border-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                مشروعي
              </span>
            )}
          </div>
        </div>

        {/* Amount + Date row */}
        <div className="flex items-center justify-between mb-4">
          {project.total_amount ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <DollarSign className="h-3.5 w-3.5 text-gray-400" />
              {formatCurrency(project.total_amount)}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">القيمة غير محددة</span>
          )}
          {project.start_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDateShort(project.start_date)}
              {project.expected_end_date && (
                <>
                  <span className="text-gray-300 mx-0.5">—</span>
                  {formatDateShort(project.expected_end_date)}
                </>
              )}
            </span>
          )}
        </div>

        {/* Team chips */}
        <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
          {project.coordinator && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-100 px-2 py-1 text-xs">
              <span className="font-bold text-blue-500 text-[10px] shrink-0">كوردنيتر</span>
              <span className="text-blue-700 font-medium">{project.coordinator.full_name}</span>
            </span>
          )}
          {project.sales_engineer && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1 text-xs">
              <span className="font-bold text-emerald-500 text-[10px] shrink-0">مبيعات</span>
              <span className="text-emerald-700 font-medium">{project.sales_engineer.full_name}</span>
            </span>
          )}
          {project.installation_person && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-100 px-2 py-1 text-xs">
              <span className="font-bold text-purple-500 text-[10px] shrink-0">تركيب</span>
              <span className="text-purple-700 font-medium">{project.installation_person.full_name}</span>
            </span>
          )}
          {!project.coordinator && !project.sales_engineer && !project.installation_person && (
            <span className="text-xs text-gray-400 italic">لم يُحدد الفريق بعد</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-50 pt-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 group-hover:gap-2 transition-all duration-150">
            عرض التفاصيل
            <ChevronLeft className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
