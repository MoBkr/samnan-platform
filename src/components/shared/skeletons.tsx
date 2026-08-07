// ─── Route loading skeletons ───
// Shared building blocks used by every (dashboard)/**/loading.tsx so a route
// transition shows the shape of the page instead of freezing on the previous
// one. RTL-safe: everything is flow-relative (start/end, gap, grid) — no
// hard-coded left/right.

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Title + description (+ optional action button) — mirrors <PageHeader />. */
export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="w-full max-w-sm">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2.5 h-4 w-64" />
      </div>
      {action && <Skeleton className="h-10 w-32 shrink-0 rounded-lg" />}
    </div>
  )
}

/** Row of KPI / stat cards. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-6 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Card grid — projects, technicians, purchase requests… */
export function CardGridSkeleton({
  count = 6,
  lines = 3,
  className,
}: {
  count?: number
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: lines }).map((_, j) => (
              <div key={j}>
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Bordered table card with a header strip and N body rows. */
export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stacked list rows inside one card — avatar + two text lines. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horizontal tab strip. */
export function TabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
  )
}

/** Form card — label + field pairs, then a submit bar. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}
