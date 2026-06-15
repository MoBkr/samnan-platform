'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BR_STAGE_LABELS } from '@/lib/constants'
import type { PurchaseRequest, BrStage, BrAttachment, BrMaterial } from '@/types/database'
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

// Reads use the service client (table has RLS enabled with no policies)
export async function getPurchaseRequests() {
  const service = createServiceClient()
  const result = (await service
    .from('purchase_requests')
    .select('*, engineer:profiles!engineer_id(id,full_name,role)')
    .order('created_at', { ascending: false })) as QueryResultMany<PurchaseRequest>
  return result.data ?? []
}

interface BrInput {
  br_number?: string | null
  release_number?: string | null
  project_name: string
  supplier_name?: string | null
  engineer_id?: string | null
  location?: string | null
  due_date?: string | null
  started_at?: string | null
  priority?: 'important' | 'medium'
  status?: 'not_started' | 'started'
  progress?: number
  stage?: BrStage
  notes?: string | null
  materials?: BrMaterial[]
}

export async function createPurchaseRequest(data: BrInput) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  if (!data.project_name?.trim()) return { error: 'يرجى إدخال اسم المشروع' }

  const stage = data.stage || 'create'
  const service = createServiceClient()
  const { error } = (await service.from('purchase_requests').insert({
    br_number: data.br_number || null,
    release_number: data.release_number || null,
    project_name: data.project_name.trim(),
    supplier_name: data.supplier_name || null,
    engineer_id: data.engineer_id || null,
    location: data.location || null,
    stage,
    status: data.status || 'not_started',
    progress: data.progress ?? 0,
    priority: data.priority || 'medium',
    due_date: data.due_date || null,
    started_at: data.started_at || null,
    notes: data.notes || null,
    attachments: [],
    materials: data.materials ?? [],
    stage_history: { [stage]: new Date().toISOString() },
    created_by: auth.user.id,
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل إنشاء الطلب' }
  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function updatePurchaseRequest(id: string, fields: Partial<BrInput>) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(fields)) {
    patch[k] = v === '' ? null : v
  }
  if (fields.project_name !== undefined) patch.project_name = fields.project_name?.trim() || null

  const service = createServiceClient()
  const { error } = (await service
    .from('purchase_requests').update(patch as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تحديث الطلب' }
  revalidatePath('/purchase-requests')
  return { success: true }
}

export async function movePurchaseRequest(id: string, stage: BrStage) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('started_at, stage_history').eq('id', id).single()) as unknown as {
      data: { started_at: string | null; stage_history: Record<string, string> | null } | null
    }

  const history = { ...(cur?.stage_history ?? {}) }
  if (!history[stage]) history[stage] = new Date().toISOString()

  const patch: Record<string, unknown> = { stage, stage_history: history, updated_at: new Date().toISOString() }
  if (stage !== 'create') {
    patch.status = 'started'
    if (cur && !cur.started_at) patch.started_at = new Date().toISOString().split('T')[0]
  }
  if (stage === 'completed') patch.progress = 100

  const { error } = (await service
    .from('purchase_requests').update(patch as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل نقل الطلب' }

  await service.from('activity_log').insert({
    project_id: null, user_id: auth.user.id,
    action: `طلب شراء — اكتملت مرحلة وانتقل إلى: ${BR_STAGE_LABELS[stage]}`, details: { br_id: id, stage },
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

export async function removeBrAttachment(id: string, url: string) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('attachments').eq('id', id).single()) as unknown as { data: { attachments: BrAttachment[] } | null }
  const list = (cur?.attachments ?? []).filter((a) => a.url !== url)
  const { error } = (await service
    .from('purchase_requests').update({ attachments: list, updated_at: new Date().toISOString() } as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف المرفق' }
  revalidatePath('/purchase-requests')
  return { success: true }
}
