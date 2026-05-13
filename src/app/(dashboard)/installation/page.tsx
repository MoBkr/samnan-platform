import { getAllInstallations } from '@/lib/actions/installation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { InstallationDashboard } from '@/components/dashboard/installation-dashboard'
import { redirect } from 'next/navigation'

export default async function InstallationPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  if (!['installation', 'coordinator', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const installations = await getAllInstallations()

  return (
    <InstallationDashboard
      profile={profile}
      installations={installations}
    />
  )
}
