import { notFound, redirect } from 'next/navigation'
import { getProject } from '@/lib/actions/projects'
import { getProjectPayments } from '@/lib/actions/payments'
import { getProjectInstallations } from '@/lib/actions/installation'
import { getProjectAttachments } from '@/lib/actions/attachments'
import { getProjectMaterials } from '@/lib/actions/materials'
import { getProjectTechnicians } from '@/lib/actions/technicians'
import { getCurrentProfile } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { ProjectSummaryView } from '@/components/projects/project-summary-view'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { ActivityLog } from '@/types/database'

export default async function ProjectSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  // Summary is for coordinator / admin only
  if (profile.role !== 'coordinator' && profile.role !== 'admin') redirect(`/projects/${id}`)

  const [project, payments, installations, attachments, material, technicianAssignments] = await Promise.all([
    getProject(id),
    getProjectPayments(id),
    getProjectInstallations(id),
    getProjectAttachments(id),
    getProjectMaterials(id),
    getProjectTechnicians(id),
  ])
  if (!project) notFound()

  const supabase = await createClient()
  const activityResult = (await supabase
    .from('activity_log').select('*, user:profiles!user_id(id, full_name)')
    .eq('project_id', id).order('created_at', { ascending: false }).limit(5)
  ) as QueryResultMany<ActivityLog>

  return (
    <ProjectSummaryView
      project={project}
      payments={payments}
      material={material}
      installations={installations}
      attachments={attachments}
      activityLog={activityResult.data ?? []}
      technicianAssignments={technicianAssignments}
    />
  )
}
