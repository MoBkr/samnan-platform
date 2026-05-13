import { notFound } from 'next/navigation'
import { getProject } from '@/lib/actions/projects'
import { getProjectPayments } from '@/lib/actions/payments'
import { getProjectMaterials, getProjectSupplyOrders } from '@/lib/actions/materials'
import { getProjectInstallations } from '@/lib/actions/installation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { ProjectDetail } from '@/components/projects/project-detail'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { ActivityLog } from '@/types/database'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [project, payments, materials, supplyOrders, installations, profile] = await Promise.all([
    getProject(id),
    getProjectPayments(id),
    getProjectMaterials(id),
    getProjectSupplyOrders(id),
    getProjectInstallations(id),
    getCurrentProfile(),
  ])

  if (!project) notFound()

  const supabase = await createClient()
  const activityResult = (await supabase
    .from('activity_log')
    .select('*, user:profiles!user_id(id, full_name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(20)) as QueryResultMany<ActivityLog>

  return (
    <ProjectDetail
      project={project}
      payments={payments}
      materials={materials}
      supplyOrders={supplyOrders}
      installations={installations}
      activityLog={activityResult.data ?? []}
      currentProfile={profile!}
    />
  )
}
