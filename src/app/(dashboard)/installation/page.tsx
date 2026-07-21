import { getAllInstallations, getInstallationProjects } from '@/lib/actions/installation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { InstallationDashboard } from '@/components/dashboard/installation-dashboard'
import { redirect } from 'next/navigation'

export default async function InstallationPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  if (!['installation', 'coordinator', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const isInstallRole = profile.role === 'installation'
  const [installations, projects] = await Promise.all([
    getAllInstallations(),
    isInstallRole ? getInstallationProjects() : Promise.resolve({ mine: [], colleagues: [] }),
  ])

  // Unfiltered on purpose: the dashboard's مشاريعي / كل المشاريع tabs scope
  // the stats and lists client-side (details of others stay locked anyway).
  return (
    <InstallationDashboard
      profile={profile}
      installations={installations}
      projects={projects}
    />
  )
}
