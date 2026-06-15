import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getTechnicians } from '@/lib/actions/technicians'
import { TechniciansManager } from '@/components/technicians/technicians-manager'

export default async function TechniciansPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['installation', 'coordinator', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const technicians = await getTechnicians()
  const canManage = ['installation', 'coordinator', 'admin'].includes(profile.role)

  return <TechniciansManager technicians={technicians} canManage={canManage} />
}
