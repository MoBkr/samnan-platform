import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/shared/skeletons'

export default function PurchaseRequestsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />

      {/* Scope tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-fit items-center gap-1 rounded-xl bg-gray-100 p-1">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-10 min-w-48 flex-1 rounded-lg" />
      </div>

      {/* Stage filter chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <CardGridSkeleton count={6} lines={2} />
    </div>
  )
}
