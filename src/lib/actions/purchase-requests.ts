'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BR_STAGE_LABELS } from '@/lib/constants'
import type { PurchaseRequest, BrStage, BrAttachment } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'

async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' as const }
  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  const role = profileResult.data?.role
  if (role !== 'coordinator' && role !== 'admin') return { error: 'متاح للكوردنيتر والإدارة فقط' as const }
  return { user }
}

export async function getPurchaseRequests() {
  const supabase = await createClient()
  const result = (await supabase
    .from('purchase_requests')
    .select('*, engineer:profiles!engineer_id(id,full_name,role)')
    .order('created_at', { ascending: false })) as QueryResultMany<PurchaseRequest>
  return result.data ?? []
}

export async function createPurchaseRequest(formData: FormData) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const get = (k: string) => {
    const v = formData.get(k) as string | null
    return v && v.trim() ? v.trim() : null
  }
  const projectName = get('project_name')
  if (!projectName) return { error: 'يرجى إدخال اسم المشروع' }

  const service = createServiceClient()
  const { error } = (await service.from('purchase_requests').insert({
    br_number: get('br_number'),
    release_number: get('release_number'),
    project_name: projectName,
    supplier_name: get('supplier_name'),
    engineer_id: get('engineer_id'),
    location: get('location'),
    stage: (get('stage') as BrStage) || 'create',
    status: (get('status') as 'not_started' | 'started') || 'not_started',
    progress: parseInt(get('progress') || '0', 10) || 0,
    priority: (get('priority') as 'important' | 'medium') || 'medium',
    due_date: get('due_date'),
    started_at: get('started_at'),
    notes: get('notes'),
    attachments: [],
    created_by: auth.user.id,
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل إنشاء الطلب' }
  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function updatePurchaseRequest(id: string, fields: Partial<Omit<PurchaseRequest, 'id' | 'engineer' | 'attachments' | 'created_at' | 'updated_at' | 'created_by'>>) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const service = createServiceClient()
  const { error } = (await service
    .from('purchase_requests')
    .update({ ...fields, updated_at: new Date().toISOString() } as never)
    .eq('id', id)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث الطلب' }
  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function movePurchaseRequest(id: string, stage: BrStage) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const service = createServiceClient()
  // Moving past 'create' marks it started + sets started_at if not set
  const patch: Record<string, unknown> = { stage, updated_at: new Date().toISOString() }
  if (stage !== 'create') {
    patch.status = 'started'
    const { data: cur } = (await service
      .from('purchase_requests').select('started_at').eq('id', id).single()) as unknown as { data: { started_at: string | null } | null }
    if (cur && !cur.started_at) patch.started_at = new Date().toISOString().split('T')[0]
  }
  if (stage === 'completed') patch.progress = 100

  const { error } = (await service
    .from('purchase_requests').update(patch as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل نقل الطلب' }

  await service.from('activity_log').insert({
    project_id: null, user_id: auth.user.id,
    action: `نقل طلب شراء إلى: ${BR_STAGE_LABELS[stage]}`, details: { br_id: id, stage },
  } as never)

  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function deletePurchaseRequest(id: string) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { error } = (await service.from('purchase_requests').delete().eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف الطلب' }
  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function addBrAttachment(id: string, attachment: BrAttachment) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('attachments').eq('id', id).single()) as unknown as { data: { attachments: BrAttachment[] } | null }
  const list = [...(cur?.attachments ?? []), attachment]
  const { error } = (await service
    .from('purchase_requests').update({ attachments: list, updated_at: new Date().toISOString() } as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ المرفق' }
  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function removeBrAttachment(id: string, index: number) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('attachments').eq('id', id).single()) as unknown as { data: { attachments: BrAttachment[] } | null }
  const list = (cur?.attachments ?? []).filter((_, i) => i !== index)
  const { error } = (await service
    .from('purchase_requests').update({ attachments: list, updated_at: new Date().toISOString() } as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف المرفق' }
  revalidatePath('/purchase-requests')
  return { success: true }
}
