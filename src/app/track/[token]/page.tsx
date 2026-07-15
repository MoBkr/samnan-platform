import { getPublicProject } from '@/lib/actions/share'
import { AutoRefresh } from './auto-refresh'
import { TrackView } from './track-view'
import { Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPublicProject(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Building2 className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">الرابط غير صالح — Invalid link</h1>
          <p className="text-sm text-gray-500 mt-1">هذا الرابط غير موجود أو تم إيقافه. تواصل مع فريق سمنان.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AutoRefresh />
      <TrackView data={data} />
    </>
  )
}
