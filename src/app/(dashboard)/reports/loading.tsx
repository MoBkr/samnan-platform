import { Skeleton } from '@/components/ui/skeleton'
import { StatCardsSkeleton, TableSkeleton } from '@/components/shared/skeletons'

export default function ReportsLoading() {
  return (
    <div>
      {/* Screen header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-44 shrink-0 rounded-lg" />
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      <div className="space-y-5">
        <StatCardsSkeleton count={4} />
        <TableSkeleton rows={8} cols={6} />
      </div>
    </div>
  )
}
