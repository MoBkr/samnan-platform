import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/shared/skeletons'

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />

      {/* مشاريعي / كل المشاريع tabs */}
      <div className="flex w-fit items-center gap-1 rounded-xl bg-gray-100 p-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 min-w-56 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <CardGridSkeleton count={6} lines={3} />
    </div>
  )
}
