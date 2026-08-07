import { Skeleton } from '@/components/ui/skeleton'
import { ListSkeleton } from '@/components/shared/skeletons'

export default function TechniciansLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-1.5 h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 shrink-0 rounded-lg" />
      </div>

      {/* Summary: total / free / busy */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <ListSkeleton rows={6} />
    </div>
  )
}
