import { PageHeaderSkeleton, TableSkeleton } from '@/components/shared/skeletons'

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} cols={7} />
    </div>
  )
}
