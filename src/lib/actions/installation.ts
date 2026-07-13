'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Installation, InstallationStatus, InstallationStages, InstallAttachment } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import { INSTALL_STAGES } from '@/lib/constants'
import { notify } from '@/lib/actions/notifications'

function stageLabel(stageKey: string) {
  return INSTALL_STAGES.find((s) => s.key === stageKey)?.label ?? stageKey
}

// Fetch the project's installation manager + name (for notifications)
async function projectManager(service: ReturnType<typeof createServiceClient>, projectId: string) {
  const r = (await service
    .from('projects').select('installation_id, project_name').eq('id', projectId).single()) as unknown as {
      data: { installation_id: string | null; project_name: string } | null
    }
  return r.data
}

// Installation stage data is editable by the installation manager (primary)
// and the coordinator/admin (follow-up) — shared permission.
async function requireInstallEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' as const }
  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  const role = profileResult.data?.role
  if (role !== 'installation' && role !== 'coordinator' && role !== 'admin') {
    return { error: 'متاح لمدير التركيبات والكوردنيتر فقط' as const }
  }
  return { user }
}

async function getStages(service: ReturnType<typeof createServiceClient>, installationId: string): Promise<InstallationStages> {
  const cur = (await service
    .from('installations').select('stages').eq('id', installationId).single()) as unknown as {
      data: { stages: InstallationStages | null } | null
    }
  return cur.data?.stages ?? {}
}

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
  const expectedDuration = (formData.get('expected_duration') as string)?.trim() || null

  if (!scheduledDate) return { error: 'يرجى تحديد تاريخ التركيب' }

  const service = createServiceClient()

  const { error } = (await service.from('installations').insert({
    project_id: projectId,
    scheduled_date: scheduledDate,
    expected_duration: expectedDuration,
    status: 'scheduled',
    installation_team_confirmed: false,
    client_notified: false,
    completion_photos: [],
    stages: {},
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل جدولة التركيب' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'جدولة التركيب',
    details: { scheduled_date: scheduledDate, expected_duration: expectedDuration },
  } as never)

  const mgr = await projectManager(service, projectId)
  await notify(mgr?.installation_id, {
    title: 'تم جدولة تركيب جديد',
    body: `مشروع «${mgr?.project_name ?? ''}» — تاريخ البدء ${scheduledDate}`,
    link: `/projects/${projectId}`, type: 'installation', projectId,
  }, user.id)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function setInstallExpectedDuration(installationId: string, projectId: string, duration: string) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { error } = (await service
    .from('installations').update({ expected_duration: duration.trim() || null } as never)
    .eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ المدة المتوقعة' }
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: 'تحديد المدة المتوقعة للتركيب', details: { installation_id: installationId, expected_duration: duration },
  } as never)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function addInstallStageFile(
  installationId: string, projectId: string, stageKey: string, file: InstallAttachment
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  stage.files = [...(stage.files ?? []), file]
  stages[stageKey] = stage
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ المرفق' }
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `إرفاق ملف في مرحلة التركيب — ${stageLabel(stageKey)}: ${file.name}`,
    details: { installation_id: installationId, stage: stageKey, slot: file.slot ?? null, file: file.name },
  } as never)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function removeInstallStageFile(
  installationId: string, projectId: string, stageKey: string, url: string
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  stage.files = (stage.files ?? []).filter((f) => f.url !== url)
  stages[stageKey] = stage
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف المرفق' }
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function addInstallStageSlot(
  installationId: string, projectId: string, stageKey: string, label: string
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  if (!label.trim()) return { error: 'يرجى إدخال اسم البند' }
  const service = createServiceClient()
  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  const key = `custom:${Date.now().toString(36)}`
  stage.customSlots = [...(stage.customSlots ?? []), { key, label: label.trim() }]
  stages[stageKey] = stage
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل إضافة البند' }
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: 'إضافة بند معاينة (IRS)', details: { installation_id: installationId, label: label.trim() },
  } as never)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function removeInstallStageSlot(
  installationId: string, projectId: string, stageKey: string, slotKey: string
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  stage.customSlots = (stage.customSlots ?? []).filter((s) => s.key !== slotKey)
  stage.files = (stage.files ?? []).filter((f) => f.slot !== slotKey)  // drop files under removed slot
  stages[stageKey] = stage
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف البند' }
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

// ── Per-item (slot) state inside a stage: each WIR item (Tank, Pipe, …) is
//    approved / marked N/A / rejected on its own. ──
export async function setInstallSlotState(
  installationId: string, projectId: string, stageKey: string, slotKey: string,
  patch: { done?: boolean; na?: boolean }
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  const slotStates = { ...(stage.slotStates ?? {}) }
  const current = { ...(slotStates[slotKey] ?? {}) }

  if (patch.done !== undefined) {
    if (patch.done && current.rejected) return { error: 'لا يمكن اعتماد بند مرفوض — احسم المشكلة أولاً' }
    current.done = patch.done
    if (patch.done) current.na = false
  }
  if (patch.na !== undefined) {
    current.na = patch.na
    if (patch.na) { current.done = false }
  }
  slotStates[slotKey] = current
  stage.slotStates = slotStates
  stages[stageKey] = stage

  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تحديث البند' }

  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `${stageLabel(stageKey)} — ${patch.na ? 'بند لا ينطبق' : patch.done ? 'اعتماد بند' : 'إعادة فتح بند'}: ${slotKey}`,
    details: { installation_id: installationId, stage: stageKey, slot: slotKey, ...patch },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

// Reject a single item inside a stage, with a note and/or attachments.
// Pass note = null to clear the rejection once resolved.
export async function setInstallSlotRejection(
  installationId: string, projectId: string, stageKey: string, slotKey: string,
  note: string | null,
  files: { url: string; name: string }[] = [],
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  if (note !== null && !note.trim() && files.length === 0) {
    return { error: 'اكتب سبب الرفض أو أرفق ملفاً على الأقل' }
  }

  const service = createServiceClient()
  const supabase = await createClient()
  const profileResult = (await supabase
    .from('profiles').select('full_name').eq('id', auth.user.id).single()) as QueryResult<{ full_name: string }>
  const byName = profileResult.data?.full_name ?? ''

  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  const slotStates = { ...(stage.slotStates ?? {}) }
  const current = { ...(slotStates[slotKey] ?? {}) }

  if (note === null) {
    delete current.rejected; delete current.rejection_note; delete current.rejection_files
    delete current.rejected_by; delete current.rejected_at
  } else {
    current.rejected = true
    current.rejection_note = note.trim()
    current.rejection_files = files
    current.rejected_by = byName
    current.rejected_at = new Date().toISOString()
    current.done = false        // a rejected item can't stay approved
  }
  slotStates[slotKey] = current
  stage.slotStates = slotStates
  stages[stageKey] = stage

  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ الرفض' }

  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: note === null
      ? `${stageLabel(stageKey)} — إلغاء رفض بند: ${slotKey}`
      : `${stageLabel(stageKey)} — رفض بند ${slotKey}: ${note.trim() || `${files.length} مرفق`}`,
    details: { installation_id: installationId, stage: stageKey, slot: slotKey, rejected: note !== null, note: note ?? null, files: files.length },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

// Reject an inspection stage (e.g. materials rejected during MIR) with a reason,
// or clear the rejection once resolved (pass note = null).
// Allowed for the installation manager, coordinator and admin.
export async function setInstallStageRejection(
  installationId: string, projectId: string, stageKey: string,
  note: string | null,
  files: { url: string; name: string }[] = [],
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  // A rejection needs a reason: either a written note or at least one attachment.
  if (note !== null && !note.trim() && files.length === 0) {
    return { error: 'اكتب سبب الرفض أو أرفق ملفاً على الأقل' }
  }

  const service = createServiceClient()

  // Who rejected (for display in the stage banner)
  const supabase = await createClient()
  const profileResult = (await supabase
    .from('profiles').select('full_name').eq('id', auth.user.id).single()) as QueryResult<{ full_name: string }>
  const byName = profileResult.data?.full_name ?? ''

  const stages = await getStages(service, installationId)
  const stage = stages[stageKey] ?? {}
  if (note === null) {
    delete stage.rejected; delete stage.rejection_note; delete stage.rejection_files
    delete stage.rejected_at; delete stage.rejected_by
  } else {
    stage.rejected = true
    stage.rejection_note = note.trim()
    stage.rejection_files = files
    stage.rejected_at = new Date().toISOString()
    stage.rejected_by = byName
    stage.done = false            // a rejected stage cannot stay "done"
  }
  stages[stageKey] = stage

  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ الرفض' }

  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: note === null
      ? `إلغاء الرفض — ${stageLabel(stageKey)}`
      : `رفض/مشكلة في ${stageLabel(stageKey)}: ${note.trim() || `${files.length} مرفق`}`,
    details: { installation_id: installationId, stage: stageKey, rejected: note !== null, note: note ?? null, files: files.length },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function updateInstallStageFlags(
  installationId: string, projectId: string, stageKey: string, flags: { done?: boolean; started?: boolean }
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const stages = await getStages(service, installationId)
  stages[stageKey] = { ...(stages[stageKey] ?? {}), ...flags }
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تحديث المرحلة' }
  const label = flags.started !== undefined ? 'تأكيد بدء الفريق' : flags.done ? 'إتمام مرحلة' : 'إعادة فتح مرحلة'
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `${label} — ${stageLabel(stageKey)}`, details: { installation_id: installationId, stage: stageKey, ...flags },
  } as never)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/installation')
  return { success: true }
}

export async function markClientNotified(installationId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('installations')
    .update({ client_notified: true } as never)
    .eq('id', installationId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث حالة الإبلاغ' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'تسجيل إبلاغ العميل بموعد التركيب',
    details: { installation_id: installationId },
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
  } else {
    // Reverting away from completed → clear the completion timestamp
    updateData.completed_at = null
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
