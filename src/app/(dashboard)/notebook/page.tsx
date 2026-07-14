import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getPersonalNotes, getNotebookUsers } from '@/lib/actions/notes'
import { PageHeader } from '@/components/shared/page-header'
import { PersonalNotebook } from '@/components/notebook/personal-notebook'

export default async function NotebookPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { user } = await searchParams
  // Only an admin may open someone else's notebook; the action enforces it too.
  const viewingId = user && profile.role === 'admin' ? user : profile.id

  const [notes, users] = await Promise.all([
    getPersonalNotes(viewingId),
    getNotebookUsers(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        title="مدونتي"
        description="دفتر ملاحظاتك الخاص — مهام وتذكيرات ومواعيد، مع إشعار عند حلول موعدها"
      />
      <PersonalNotebook
        notes={notes}
        currentProfile={profile}
        users={users}
        viewingId={viewingId}
      />
    </div>
  )
}
