import { notFound } from 'next/navigation'
import { getProject } from '@/lib/actions/projects'
import { getProjectPayments } from '@/lib/actions/payments'
import { getProjectInstallations } from '@/lib/actions/installation'
import { getProjectAttachments } from '@/lib/actions/attachments'
import { getProjectMaterials } from '@/lib/actions/materials'
import { getCurrentProfile } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { ProjectDetail } from '@/components/projects/project-detail'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { ActivityLog, Profile } from '@/types/database'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [project, payments, installations, attachments, material, profile] = await Promise.all([
    getProject(id),
    getProjectPayments(id),
    getProjectInstallations(id),
    getProjectAttachments(id),
    getProjectMaterials(id),
    getCurrentProfile(),
  ])

  if (!project) notFound()

  const supabase = await createClient()

  const activityResult = (await supabase
    .from('activity_log').select('*, user:profiles!user_id(id, full_name)')
    .eq('project_id', id).order('created_at', { ascending: false }).limit(20)
  ) as QueryResultMany<ActivityLog>

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

  const installationProjectsData = (await supabase
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
  for (const p of installationProjectsData.data ?? []) {
    if (p.installation_id) installationWorkload[p.installation_id] = (installationWorkload[p.installation_id] ?? 0) + 1
  }

  return (
    <ProjectDetail
      project={project}
      payments={payments}
      installations={installations}
      attachments={attachments}
      material={material}
      activityLog={activityResult.data ?? []}
      currentProfile={profile!}
      coordinators={coordinatorsResult.data ?? []}
      salesEngineers={salesResult.data ?? []}
      installationPersons={installationResult.data ?? []}
      coordinatorWorkload={coordinatorWorkload}
      salesWorkload={salesWorkload}
      installationWorkload={installationWorkload}
    />
  )
}
