'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { formatCurrency } from '@/lib/utils'
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
    .select('*, coordinator:profiles!coordinator_id(id,full_name,role), sales_engineer:profiles!sales_engineer_id(id,full_name,role), installation_person:profiles!installation_id(id,full_name,role)')
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
    .select('*, coordinator:profiles!coordinator_id(id,full_name,role), sales_engineer:profiles!sales_engineer_id(id,full_name,role), installation_person:profiles!installation_id(id,full_name,role)')
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
  const locationValue = formData.get('location') as string
  const totalAmount = formData.get('total_amount') as string
  const startDate = formData.get('start_date') as string
  const expectedEndDate = formData.get('expected_end_date') as string
  const coordinatorId = formData.get('coordinator_id') as string
  const salesEngineerId = formData.get('sales_engineer_id') as string
  const installationId = formData.get('installation_id') as string
  const contractUrl = formData.get('contract_url') as string

  if (!clientName || !projectName) {
    return { error: 'يرجى ملء اسم العميل واسم المشروع' }
  }

  const service = createServiceClient()
  const { data, error } = (await service.from('projects').insert({
    client_name: clientName,
    project_name: projectName,
    location: locationValue || null,
    total_amount: totalAmount ? parseFloat(totalAmount) : null,
    start_date: startDate || null,
    expected_end_date: expectedEndDate || null,
    coordinator_id: coordinatorId || null,
    sales_engineer_id: salesEngineerId || null,
    installation_id: installationId || null,
    contract_url: contractUrl || null,
    status: 'active',
  } as never).select().single()) as unknown as { data: Project | null; error: Error | null }

  if (error) return { error: 'فشل إنشاء المشروع. حاول مرة أخرى' }

  await logActivity(service, data!.id, user.id, 'إنشاء المشروع', { project_name: projectName })

  revalidatePath('/projects')
  return { projectId: data!.id }
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
  salesEngineerId: string | null,
  installationId: string | null
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
      installation_id: installationId || null,
    } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث الفريق' }

  await logActivity(service, projectId, user.id, 'تحديث فريق المشروع', {
    coordinator_id: coordinatorId,
    sales_engineer_id: salesEngineerId,
    installation_id: installationId,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProjectInfo(
  projectId: string,
  data: {
    project_name: string
    client_name: string
    location: string | null
    total_amount: number | null
    start_date: string | null
    expected_end_date: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  if (!data.project_name.trim() || !data.client_name.trim()) {
    return { error: 'اسم المشروع واسم العميل مطلوبان' }
  }

  const service = createServiceClient()
  const { error } = (await service
    .from('projects')
    .update({
      project_name: data.project_name.trim(),
      client_name: data.client_name.trim(),
      location: data.location || null,
      total_amount: data.total_amount,
      start_date: data.start_date || null,
      expected_end_date: data.expected_end_date || null,
    } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث بيانات المشروع' }

  await logActivity(service, projectId, user.id, 'تعديل معلومات المشروع', {
    project_name: data.project_name, client_name: data.client_name,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProjectAmount(projectId: string, totalAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()

  const { data: existing } = (await service
    .from('projects').select('total_amount').eq('id', projectId).single()) as unknown as { data: { total_amount: number | null } | null }

  const { error } = (await service
    .from('projects')
    .update({ total_amount: totalAmount } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث قيمة المشروع' }

  await logActivity(service, projectId, user.id, 'تعديل قيمة المشروع', {
    changes: {
      'قيمة المشروع': {
        from: existing?.total_amount != null ? formatCurrency(existing.total_amount) : '—',
        to: formatCurrency(totalAmount),
      },
    },
  })

  revalidatePath(`/projects/${projectId}`)
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

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const profileResult = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: string }>

  const role = profileResult.data?.role
  if (role !== 'admin' && role !== 'coordinator') return { error: 'الحذف متاح للكوردنيتر والإدارة فقط' }

  const service = createServiceClient()

  const projectResult = (await service
    .from('projects')
    .select('status, project_name')
    .eq('id', projectId)
    .single()) as unknown as { data: { status: string; project_name: string } | null }

  if (!projectResult.data) return { error: 'المشروع غير موجود' }

  const { status } = projectResult.data
  if (status !== 'cancelled' && status !== 'on_hold') {
    return { error: 'يمكن حذف المشاريع الملغاة أو المعلقة فقط' }
  }

  // Delete related records in order (FK constraints)
  await service.from('activity_log').delete().eq('project_id', projectId)
  await service.from('payments').delete().eq('project_id', projectId)
  await service.from('installations').delete().eq('project_id', projectId)
  await service.from('supply_orders').delete().eq('project_id', projectId)
  await service.from('materials').delete().eq('project_id', projectId)
  await service.from('documents').delete().eq('project_id', projectId)
  await (service.from('projects').delete().eq('id', projectId) as unknown as Promise<unknown>)

  revalidatePath('/projects')
  revalidatePath('/dashboard')
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
