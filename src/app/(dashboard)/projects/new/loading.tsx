import { PageHeaderSkeleton, FormSkeleton } from '@/components/shared/skeletons'

export default function NewProjectLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeaderSkeleton />
      <FormSkeleton fields={7} />
    </div>
  )
}
