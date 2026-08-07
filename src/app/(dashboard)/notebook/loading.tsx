import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton } from '@/components/shared/skeletons'

export default function NotebookLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />

      {/* Composer */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="mt-3 flex justify-end">
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2.5">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="mt-2 h-3.5 w-2/3" />
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
