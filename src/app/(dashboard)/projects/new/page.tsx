import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/actions/auth'
import { PageHeader } from '@/components/shared/page-header'
import { NewProjectForm } from '@/components/projects/new-project-form'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export default async function NewProjectPage() {
  const profile = await getCurrentProfile()

  // Only coordinators (operational managers) and admin can create projects
  if (!profile || (profile.role !== 'coordinator' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const coordinatorsResult = (await supabase
    .from('profiles').select('id, full_name, role').eq('role', 'coordinator').eq('is_active', true)
  ) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>

  const salesResult = (await supabase
    .from('profiles').select('id, full_name, role').eq('role', 'sales_engineer').eq('is_active', true)
  ) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>

  const installationResult = (await supabase
    .from('profiles').select('id, full_name, role').eq('role', 'installation').eq('is_active', true)
  ) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>

  const coordinatorProjects = (await supabase
    .from('projects').select('coordinator_id').eq('status', 'active').not('coordinator_id', 'is', null)
  ) as QueryResultMany<{ coordinator_id: string }>

  const salesProjects = (await supabase
    .from('projects').select('sales_engineer_id').eq('status', 'active').not('sales_engineer_id', 'is', null)
  ) as QueryResultMany<{ sales_engineer_id: string }>

  const installationProjects = (await supabase
    .from('projects').select('installation_id').eq('status', 'active').not('installation_id', 'is', null)
  ) as QueryResultMany<{ installation_id: string }>

  const coordinatorWorkload: Record<string, number> = {}
  for (const p of coordinatorProjects.data ?? []) {
    if (p.coordinator_id) coordinatorWorkload[p.coordinator_id] = (coordinatorWorkload[p.coordinator_id] ?? 0) + 1
  }
  const salesWorkload: Record<string, number> = {}
  for (const p of salesProjects.data ?? []) {
    if (p.sales_engineer_id) salesWorkload[p.sales_engineer_id] = (salesWorkload[p.sales_engineer_id] ?? 0) + 1
  }
  const installationWorkload: Record<string, number> = {}
  for (const p of installationProjects.data ?? []) {
    if (p.installation_id) installationWorkload[p.installation_id] = (installationWorkload[p.installation_id] ?? 0) + 1
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="مشروع جديد" description="أدخل تفاصيل المشروع الجديد" />
      <NewProjectForm
        coordinators={coordinatorsResult.data ?? []}
        salesEngineers={salesResult.data ?? []}
        installationPersons={installationResult.data ?? []}
        coordinatorWorkload={coordinatorWorkload}
        salesWorkload={salesWorkload}
        installationWorkload={installationWorkload}
        currentProfile={profile}
      />
    </div>
  )
}
