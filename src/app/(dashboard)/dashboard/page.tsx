import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getProjects } from '@/lib/actions/projects'
import { getAllOverduePayments } from '@/lib/actions/payments'
import { getAllInstallations } from '@/lib/actions/installation'
import { CoordinatorDashboard } from '@/components/dashboard/coordinator-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { SalesEngineerDashboard } from '@/components/dashboard/sales-engineer-dashboard'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  if (profile.role === 'installation') redirect('/installation')

  const [projects, overduePayments, installations] = await Promise.all([
    getProjects(),
    getAllOverduePayments(),
    getAllInstallations(),
  ])

  const supabase = await createClient()
  const usersResult = (await supabase.from('profiles').select('*').eq('is_active', true)) as QueryResultMany<Profile>
  const users = usersResult.data ?? []

  const activeProjects = projects.filter((p) => p.status === 'active')

  if (profile.role === 'coordinator') {
    const myProjects = projects.filter((p) => p.coordinator_id === profile.id)
    return (
      <CoordinatorDashboard
        profile={profile}
        myProjects={myProjects}
        allProjects={projects}
        overduePayments={overduePayments}
        installations={installations}
      />
    )
  }

  if (profile.role === 'admin') {
    return (
      <AdminDashboard
        profile={profile}
        projects={projects}
        overduePayments={overduePayments}
        users={users}
      />
    )
  }

  if (profile.role === 'sales_engineer') {
    return (
      <SalesEngineerDashboard
        profile={profile}
        projects={projects}
      />
    )
  }

  redirect('/login')
}
