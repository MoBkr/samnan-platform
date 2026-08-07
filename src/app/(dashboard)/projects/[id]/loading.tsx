import { Skeleton } from '@/components/ui/skeleton'
import { TabsSkeleton } from '@/components/shared/skeletons'

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Project header card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
            {/* Team chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-36 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>

        {/* Financial cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-5 w-24" />
            </div>
          ))}
        </div>

        {/* Lifecycle progress */}
        <Skeleton className="mt-5 h-2.5 w-full rounded-full" />
      </div>

      <TabsSkeleton count={6} />

      {/* Active tab body */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
