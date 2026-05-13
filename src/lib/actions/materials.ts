'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Material, MaterialItem, MaterialStatus } from '@/types/database'
import type { QueryResultMany, QueryResult } from '@/lib/supabase/typed'

export async function getProjectMaterials(projectId: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('materials')
    .select('*')
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false })) as QueryResultMany<Material>
  return result.data ?? []
}

export async function getAllPendingMaterials() {
  const supabase = await createClient()
  const result = (await supabase
    .from('materials')
    .select('*, project:projects(id, client_name, project_name)')
    .in('status', ['pending', 'preparing'])
    .order('requested_at', { ascending: true })) as QueryResultMany<Material & { project: { id: string; client_name: string; project_name: string } }>
  return result.data ?? []
}

async function isFinalPaymentPaid(service: ReturnType<typeof createServiceClient>, projectId: string): Promise<boolean> {
  const result = (await service
    .from('payments')
    .select('status')
    .eq('project_id', projectId)
    .eq('type', 'final')
    .eq('status', 'paid')
    .limit(1)) as unknown as { data: { status: string }[] | null }
  return (result.data?.length ?? 0) > 0
}

export async function createMaterialRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const projectId = formData.get('project_id') as string
  const itemsJson = formData.get('items') as string
  const notes = formData.get('notes') as string

  let items: MaterialItem[]
  try {
    items = JSON.parse(itemsJson)
    if (!Array.isArray(items) || items.length === 0) throw new Error()
  } catch {
    return { error: 'يرجى إضافة مادة واحدة على الأقل' }
  }

  const service = createServiceClient()

  // Require upfront payment (or final payment as full prepay)
  const finalPaid = await isFinalPaymentPaid(service, projectId)
  if (!finalPaid) {
    const upfrontPayment = (await service
      .from('payments')
      .select('status')
      .eq('project_id', projectId)
      .eq('type', 'upfront')
      .eq('status', 'paid')
      .limit(1)) as unknown as { data: { status: string }[] | null }
    if ((upfrontPayment.data?.length ?? 0) === 0) {
      return { error: 'لا يمكن طلب المواد — يجب تحصيل الدفعة الأولى أولاً' }
    }
  }

  const { error } = (await service.from('materials').insert({
    project_id: projectId,
    requested_by: user.id,
    status: 'pending',
    items,
    notes: notes || null,
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل إرسال طلب المواد' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'إرسال طلب مواد',
    details: { items_count: items.length },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/supply')
  return { success: true }
}

export async function updateMaterialStatus(materialId: string, status: MaterialStatus, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('materials')
    .update({
      status,
      ...(status === 'ready' ? { ready_at: new Date().toISOString() } : {}),
    } as never)
    .eq('id', materialId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث حالة الطلب' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: `تحديث حالة المواد إلى ${status}`,
    details: { material_id: materialId, status },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/supply')
  return { success: true }
}

export async function getProjectSupplyOrders(projectId: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('supply_orders')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })) as QueryResultMany<import('@/types/database').SupplyOrder>
  return result.data ?? []
}

export async function scheduleSupplyOrder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const projectId = formData.get('project_id') as string
  const materialId = formData.get('material_id') as string
  const scheduledDate = formData.get('scheduled_date') as string

  const service = createServiceClient()

  // Allow if final payment already covers everything
  const finalPaid = await isFinalPaymentPaid(service, projectId)
  if (!finalPaid) {
    // Otherwise require dedicated supply payment
    const supplyPayment = (await service
      .from('payments')
      .select('status')
      .eq('project_id', projectId)
      .eq('type', 'supply')
      .single()) as QueryResult<{ status: string }>

    if (!supplyPayment.data || supplyPayment.data.status !== 'paid') {
      return { error: 'لا يمكن جدولة التوريد — دفعة التوريد غير مكتملة (أو أضف دفعة نهائية شاملة)' }
    }
  }

  const { error } = (await service.from('supply_orders').insert({
    project_id: projectId,
    material_id: materialId || null,
    scheduled_date: scheduledDate,
    status: 'scheduled',
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل جدولة التوريد' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'جدولة طلب توريد',
    details: { scheduled_date: scheduledDate },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/supply')
  return { success: true }
}

export async function completeSupplyOrder(orderId: string, projectId: string, receiptUrl?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('supply_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_receipt_url: receiptUrl || null,
    } as never)
    .eq('id', orderId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تأكيد التوريد' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'تأكيد اكتمال التوريد',
    details: { order_id: orderId },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/supply')
  return { success: true }
}
