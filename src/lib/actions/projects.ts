'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Project, ProjectStatus } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'

export async function getProjects(filters?: { status?: ProjectStatus; search?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const profileResult = (await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: string; id: string }>

  const profile = profileResult.data
  if (!profile) return []

  let query = supabase
    .from('projects')
    .select('*, coordinator:profiles!coordinator_id(id,full_name,role), sales_engineer:profiles!sales_engineer_id(id,full_name,role)')
    .order('created_at', { ascending: false })

  if (profile.role === 'sales_engineer') {
    query = query.eq('sales_engineer_id', user.id) as typeof query
  }

  if (filters?.status) {
    query = query.eq('status', filters.status) as typeof query
  }

  if (filters?.search) {
    query = query.or(`client_name.ilike.%${filters.search}%,project_name.ilike.%${filters.search}%`) as typeof query
  }

  const result = (await query) as QueryResultMany<Project>
  return result.data ?? []
}

export async function getProject(id: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('projects')
    .select('*, coordinator:profiles!coordinator_id(id,full_name,role), sales_engineer:profiles!sales_engineer_id(id,full_name,role)')
    .eq('id', id)
    .single()) as QueryResult<Project>
  return result.data
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const clientName = formData.get('client_name') as string
  const projectName = formData.get('project_name') as string
  const totalAmount = formData.get('total_amount') as string
  const startDate = formData.get('start_date') as string
  const expectedEndDate = formData.get('expected_end_date') as string
  const coordinatorId = formData.get('coordinator_id') as string
  const salesEngineerId = formData.get('sales_engineer_id') as string
  const contractUrl = formData.get('contract_url') as string

  if (!clientName || !projectName) {
    return { error: 'يرجى ملء اسم العميل واسم المشروع' }
  }

  const service = createServiceClient()
  const { data, error } = (await service.from('projects').insert({
    client_name: clientName,
    project_name: projectName,
    total_amount: totalAmount ? parseFloat(totalAmount) : null,
    start_date: startDate || null,
    expected_end_date: expectedEndDate || null,
    coordinator_id: coordinatorId || null,
    sales_engineer_id: salesEngineerId || null,
    contract_url: contractUrl || null,
    status: 'active',
  } as never).select().single()) as unknown as { data: Project | null; error: Error | null }

  if (error) return { error: 'فشل إنشاء المشروع. حاول مرة أخرى' }

  await logActivity(service, data!.id, user.id, 'إنشاء المشروع', { project_name: projectName })

  revalidatePath('/projects')
  redirect(`/projects/${data!.id}`)
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  cancellationReason?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  if (status === 'cancelled' && !cancellationReason) {
    return { error: 'يجب إدخال سبب الإلغاء' }
  }

  if (status === 'completed') {
    const service = createServiceClient()
    const paymentsResult = (await service
      .from('payments')
      .select('status')
      .eq('project_id', projectId)
      .in('status', ['pending', 'partial'])) as unknown as { data: { status: string }[] | null }

    if (paymentsResult.data && paymentsResult.data.length > 0) {
      return { error: 'لا يمكن إغلاق المشروع — يوجد مدفوعات معلقة أو جزئية' }
    }
  }

  const service = createServiceClient()
  const { error } = (await service
    .from('projects')
    .update({
      status,
      ...(status === 'cancelled' ? { cancellation_reason: cancellationReason } : {}),
    } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث حالة المشروع' }

  await logActivity(service, projectId, user.id, `تغيير حالة المشروع إلى ${status}`, { status })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProjectTeam(
  projectId: string,
  coordinatorId: string | null,
  salesEngineerId: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('projects')
    .update({
      coordinator_id: coordinatorId || null,
      sales_engineer_id: salesEngineerId || null,
    } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث الفريق' }

  await logActivity(service, projectId, user.id, 'تحديث فريق المشروع', {
    coordinator_id: coordinatorId,
    sales_engineer_id: salesEngineerId,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true }
}

export async function uploadContractUrl(projectId: string, url: string) {
  const service = createServiceClient()
  const { error } = (await service
    .from('projects')
    .update({ contract_url: url } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل رفع العقد' }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logActivity(service: ReturnType<typeof createServiceClient>, projectId: string, userId: string, action: string, details: Record<string, any>) {
  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    action,
    details,
  } as never)
}
