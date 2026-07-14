import { redirect } from 'next/navigation'
import { getMyAccount } from '@/lib/actions/profile'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const account = await getMyAccount()
  if (!account) redirect('/login')

  return (
    <div className="space-y-5">
      <PageHeader
        title="ملفي الشخصي"
        description="صورتك وبياناتك وكلمة المرور"
      />
      <ProfileForm profile={account.profile} email={account.email} />
    </div>
  )
}
