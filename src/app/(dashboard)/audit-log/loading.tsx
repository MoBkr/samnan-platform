import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, TableSkeleton } from '@/components/shared/skeletons'

export default function AuditLogLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Filters (user / action / date) */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 min-w-56 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <TableSkeleton rows={10} cols={4} />
    </div>
  )
}
