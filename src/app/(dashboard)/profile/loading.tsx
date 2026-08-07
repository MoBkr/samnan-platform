import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, FormSkeleton } from '@/components/shared/skeletons'

export default function ProfileLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />

      {/* Avatar card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
            <Skeleton className="mt-3 h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      <FormSkeleton fields={4} />
    </div>
  )
}
