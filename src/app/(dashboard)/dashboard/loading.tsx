import { Skeleton } from '@/components/ui/skeleton'
import { StatCardsSkeleton, ListSkeleton } from '@/components/shared/skeletons'

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gray-100 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full max-w-xs">
            <Skeleton className="h-3.5 w-24 bg-gray-300" />
            <Skeleton className="mt-2 h-7 w-48 bg-gray-300" />
            <Skeleton className="mt-2 h-3.5 w-32 bg-gray-300" />
          </div>
          <Skeleton className="h-10 w-36 shrink-0 rounded-lg bg-gray-300" />
        </div>
      </div>

      {/* Reports quick-access strip */}
      <Skeleton className="h-16 w-full rounded-2xl" />

      <StatCardsSkeleton count={4} />

      {/* Progress overview */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <Skeleton className="h-4 w-40" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="mt-2 h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListSkeleton rows={4} />
        <ListSkeleton rows={4} />
      </div>
    </div>
  )
}
