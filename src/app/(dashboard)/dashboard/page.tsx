import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getProjects } from '@/lib/actions/projects'
import { getAllOverduePayments } from '@/lib/actions/payments'
import { getAllPendingMaterials } from '@/lib/actions/materials'
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

  if (profile.role === 'supply') redirect('/supply')
  if (profile.role === 'installation') redirect('/installation')

  const [projects, overduePayments, pendingMaterials, installations] = await Promise.all([
    getProjects(),
    getAllOverduePayments(),
    getAllPendingMaterials(),
    getAllInstallations(),
  ])

  const supabase = await createClient()
  const usersResult = (await supabase.from('profiles').select('*').eq('is_active', true)) as QueryResultMany<Profile>
  const users = usersResult.data ?? []

  const activeProjects = projects.filter((p) => p.status === 'active')

  if (profile.role === 'coordinator') {
    return (
      <CoordinatorDashboard
        profile={profile}
        activeProjects={activeProjects}
        overduePayments={overduePayments}
        pendingMaterials={pendingMaterials}
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
