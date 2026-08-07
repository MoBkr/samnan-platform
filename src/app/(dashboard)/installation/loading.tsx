import { Skeleton } from '@/components/ui/skeleton'
import { StatCardsSkeleton, CardGridSkeleton } from '@/components/shared/skeletons'

export default function InstallationLoading() {
  return (
    <div className="space-y-5">
      {/* Header + scope tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1.5 h-3 w-48" />
          </div>
        </div>
        <div className="flex w-fit items-center gap-1 rounded-xl bg-gray-100 p-1">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <StatCardsSkeleton count={4} />
      <CardGridSkeleton count={6} lines={2} />
    </div>
  )
}
