import { PageHeaderSkeleton, TableSkeleton } from '@/components/shared/skeletons'

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
