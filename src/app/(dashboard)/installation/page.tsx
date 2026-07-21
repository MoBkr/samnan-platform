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
  const [allInstallations, projects] = await Promise.all([
    getAllInstallations(),
    isInstallRole ? getInstallationProjects() : Promise.resolve({ mine: [], colleagues: [] }),
  ])

  // Installation managers see only THEIR schedule; colleagues' projects stay
  // detail-free (they appear in the read-only "مشاريع الزملاء" tab instead).
  const installations = isInstallRole
    ? allInstallations.filter((i) => i.project?.installation_id === profile.id)
    : allInstallations

  return (
    <InstallationDashboard
      profile={profile}
      installations={installations}
      projects={projects}
    />
  )
}
