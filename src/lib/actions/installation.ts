'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Installation, InstallationStatus } from '@/types/database'
import type { QueryResultMany } from '@/lib/supabase/typed'

export async function getProjectInstallations(projectId: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('installations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })) as QueryResultMany<Installation>
  return result.data ?? []
}

export async function getAllInstallations() {
  const supabase = await createClient()
  const result = (await supabase
    .from('installations')
    .select('*, project:projects(id, client_name, project_name)')
    .not('status', 'eq', 'completed')
    .order('scheduled_date', { ascending: true })) as QueryResultMany<Installation & { project: { id: string; client_name: string; project_name: string } }>
  return result.data ?? []
}

export async function scheduleInstallation(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const projectId = formData.get('project_id') as string
  const scheduledDate = formData.get('scheduled_date') as string

  if (!scheduledDate) return { error: 'يرجى تحديد تاريخ التركيب' }

  const service = createServiceClient()

  // Require installation payment (or final payment as full prepay)
  const finalPayment = (await service
    .from('payments')
    .select('status')
    .eq('project_id', projectId)
    .eq('type', 'final')
    .eq('status', 'paid')
    .limit(1)) as unknown as { data: { status: string }[] | null }

  const finalPaid = (finalPayment.data?.length ?? 0) > 0

  if (!finalPaid) {
    const installationPayment = (await service
      .from('payments')
      .select('status')
      .eq('project_id', projectId)
      .eq('type', 'installation')
      .single()) as unknown as { data: { status: string } | null }

    if (!installationPayment.data || installationPayment.data.status !== 'paid') {
      return { error: 'لا يمكن جدولة التركيب — دفعة التركيب غير مكتملة (أو أضف دفعة نهائية شاملة)' }
    }
  }

  const { error } = (await service.from('installations').insert({
    project_id: projectId,
    scheduled_date: scheduledDate,
    status: 'scheduled',
    installation_team_confirmed: false,
    client_notified: false,
    completion_photos: [],
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل جدولة التركيب' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'جدولة التركيب',
    details: { scheduled_date: scheduledDate },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function updateInstallationStatus(
  installationId: string,
  projectId: string,
  status: InstallationStatus,
  extras?: { delayReason?: string; photos?: string[] }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const updateData: Record<string, unknown> = { status }

  if (status === 'confirmed') updateData.installation_team_confirmed = true
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    if (extras?.photos?.length) updateData.completion_photos = extras.photos
  }
  if (status === 'delayed' && extras?.delayReason) {
    updateData.delay_reason = extras.delayReason
  }

  const { error } = (await service
    .from('installations')
    .update(updateData as never)
    .eq('id', installationId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث حالة التركيب' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: `تحديث حالة التركيب إلى ${status}`,
    details: { installation_id: installationId, status },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}
