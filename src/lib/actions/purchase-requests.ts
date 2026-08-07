'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BR_STAGES, BR_STAGE_LABELS } from '@/lib/constants'
import { purgeFiles } from '@/lib/file-cleanup'
import type { PurchaseRequest, BrStage, BrAttachment, BrMaterial } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import { requireManager as requireManagerGuard, requireAuth } from '@/lib/auth/guards'

async function requireManager() {
  const guard = await requireManagerGuard()
  if ('error' in guard) return { error: 'متاح لمهندس إدارة المشاريع والإدارة فقط' as const }
  return { user: { id: guard.ctx.userId } }
}

// Reads use the service client (table has RLS enabled with no policies), so
// the guard here is the only thing standing between a caller and every
// purchase request in the company.
export async function getPurchaseRequests() {
  const guard = await requireAuth()
  if ('error' in guard) return []
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
  project_name?: string | null
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
  attachments?: BrAttachment[]
}

export async function createPurchaseRequest(data: BrInput) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const stage = data.stage || 'create'
  const service = createServiceClient()
  const { error } = (await service.from('purchase_requests').insert({
    br_number: data.br_number || null,
    release_number: data.release_number || null,
    project_name: data.project_name?.trim() || null,
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
    attachments: data.attachments ?? [],
    materials: data.materials ?? [],
    stage_history: { [stage]: new Date().toISOString() },
    created_by: auth.user.id,
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل إنشاء الطلب' }
  const newProjectId = await resolveProjectId(service, data.project_name ?? null)
  await service.from('activity_log').insert({
    project_id: newProjectId, user_id: auth.user.id,
    action: `إنشاء طلب شراء: ${data.project_name?.trim() || 'بدون مشروع'}`,
    details: { project_name: data.project_name?.trim() || null },
  } as never)
  revalidatePath('/purchase-requests')
  if (newProjectId) revalidatePath(`/projects/${newProjectId}`)
  return { success: true }
}

export async function updatePurchaseRequest(id: string, fields: Partial<BrInput>) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  // Only these columns may be written. Copying every key the caller sent let a
  // manager forge id / created_by / stage_history by adding them to the payload.
  const EDITABLE = [
    'br_number', 'release_number', 'project_name', 'supplier_name', 'engineer_id',
    'location', 'due_date', 'started_at', 'priority', 'status', 'progress',
    'notes', 'materials',
  ] as const
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of EDITABLE) {
    if (!(key in fields)) continue
    const v = (fields as Record<string, unknown>)[key]
    patch[key] = v === '' ? null : v
  }
  if (fields.project_name !== undefined) patch.project_name = fields.project_name?.trim() || null

  const service = createServiceClient()
  const { error } = (await service
    .from('purchase_requests').update(patch as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تحديث الطلب' }
  const { data: after } = (await service
    .from('purchase_requests').select('project_name').eq('id', id).single()) as unknown as { data: { project_name: string | null } | null }
  const projectId = await resolveProjectId(service, after?.project_name ?? null)
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: 'تعديل بيانات طلب شراء', details: { br_id: id },
  } as never)
  revalidatePath('/purchase-requests')
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function movePurchaseRequest(id: string, stage: BrStage) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }

  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('stage, started_at, stage_history, project_name').eq('id', id).single()) as unknown as {
      data: { stage: BrStage; started_at: string | null; stage_history: Record<string, string> | null; project_name: string | null } | null
    }

  // Backward move = reopening ONE stage to fix a mistake. Later stages keep
  // their completion stamps — after the fix, a single advance jumps the
  // request straight back to where it was.
  const isBack = cur ? BR_STAGES.indexOf(stage) < BR_STAGES.indexOf(cur.stage) : false

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

  const projectId = await resolveProjectId(service, cur?.project_name ?? null)
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: isBack
      ? `طلب شراء — إعادة فتح مرحلة: ${BR_STAGE_LABELS[stage]}`
      : `طلب شراء — اكتملت مرحلة وانتقل إلى: ${BR_STAGE_LABELS[stage]}`,
    details: { br_id: id, stage, reopened: isBack },
  } as never)

  revalidatePath('/purchase-requests')
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deletePurchaseRequest(id: string) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()

  const { data: cur } = (await service
    .from('purchase_requests').select('attachments, project_name, br_number').eq('id', id).single()) as unknown as {
      data: { attachments: BrAttachment[] | null; project_name: string | null; br_number: string | null } | null
    }

  const { error } = (await service.from('purchase_requests').delete().eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف الطلب' }

  // Its attachments must not linger in the project's Attachments tab or storage
  const urls = (cur?.attachments ?? []).map((a) => a.url)
  const projectId = await resolveProjectId(service, cur?.project_name ?? null)
  await purgeFiles(service, projectId, urls)

  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `حذف طلب شراء${cur?.br_number ? ` ${cur.br_number}` : ''}`,
    details: { br_id: id, attachments: (cur?.attachments ?? []).map((a) => a.name) },
  } as never)
  revalidatePath('/purchase-requests')
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// Resolve the project linked to a purchase request (matched by project name).
async function resolveProjectId(
  service: ReturnType<typeof createServiceClient>, projectName: string | null,
): Promise<string | null> {
  if (!projectName?.trim()) return null
  const r = (await service
    .from('projects').select('id').eq('project_name', projectName.trim())
    .order('created_at', { ascending: false }).limit(1).single()) as QueryResult<{ id: string }>
  return r.data?.id ?? null
}

// Save extra BR attachments into the LINKED PROJECT's documents (Attachments tab).
// Resolves the project by exact project_name match.
export async function attachDocsToProjectByName(projectName: string, docs: { url: string; name: string }[]) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  if (!projectName?.trim() || !docs?.length) return { attached: 0, found: false }

  const service = createServiceClient()
  const proj = (await service
    .from('projects').select('id, project_name').eq('project_name', projectName.trim())
    .order('created_at', { ascending: false }).limit(1).single()) as QueryResult<{ id: string; project_name: string }>
  if (!proj.data) return { attached: 0, found: false }

  const rows = docs.map((d) => ({
    project_id: proj.data!.id,
    type: 'other',
    url: d.url,
    uploaded_by: auth.user.id,
    description: d.name,
  }))
  const { error } = (await service.from('documents').insert(rows as never)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ المرفقات في المشروع' }

  await service.from('activity_log').insert({
    project_id: proj.data.id, user_id: auth.user.id,
    action: `إرفاق ${docs.length} مستند من طلب شراء`, details: { from: 'purchase_request', count: docs.length },
  } as never)

  revalidatePath(`/projects/${proj.data.id}`)
  return { attached: docs.length, found: true }
}

export async function addBrAttachment(id: string, attachment: BrAttachment) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('attachments, project_name, br_number').eq('id', id).single()) as unknown as {
      data: { attachments: BrAttachment[]; project_name: string | null; br_number: string | null } | null
    }
  const list = [...(cur?.attachments ?? []), attachment]
  const { error } = (await service
    .from('purchase_requests').update({ attachments: list, updated_at: new Date().toISOString() } as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ المرفق' }

  // Mirror it into the linked project's Attachments tab + audit log
  const projectId = await resolveProjectId(service, cur?.project_name ?? null)
  if (projectId) {
    await service.from('documents').insert({
      project_id: projectId, type: 'other', url: attachment.url, uploaded_by: auth.user.id,
      description: `طلب شراء${cur?.br_number ? ` ${cur.br_number}` : ''}${attachment.stage ? ` / ${attachment.stage}` : ''}: ${attachment.name}`,
    } as never)
  }
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `إرفاق ملف بطلب شراء${cur?.br_number ? ` ${cur.br_number}` : ''}: ${attachment.name}`,
    details: { br_id: id, stage: attachment.stage ?? null, file: attachment.name },
  } as never)

  revalidatePath('/purchase-requests')
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function removeBrAttachment(id: string, url: string) {
  const auth = await requireManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: cur } = (await service
    .from('purchase_requests').select('attachments, project_name, br_number').eq('id', id).single()) as unknown as {
      data: { attachments: BrAttachment[]; project_name: string | null; br_number: string | null } | null
    }
  const removed = (cur?.attachments ?? []).find((a) => a.url === url)
  const list = (cur?.attachments ?? []).filter((a) => a.url !== url)
  const { error } = (await service
    .from('purchase_requests').update({ attachments: list, updated_at: new Date().toISOString() } as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف المرفق' }

  const projectId = await resolveProjectId(service, cur?.project_name ?? null)
  // Also drop it from the project's Attachments tab and from storage
  await purgeFiles(service, projectId, [url])
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `حذف مرفق من طلب شراء${cur?.br_number ? ` ${cur.br_number}` : ''}: ${removed?.name ?? ''}`,
    details: { br_id: id, file: removed?.name ?? null },
  } as never)

  revalidatePath('/purchase-requests')
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
