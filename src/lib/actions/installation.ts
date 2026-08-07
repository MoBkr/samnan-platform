'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Installation, InstallationStatus, InstallationStages, InstallAttachment } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import { INSTALL_STAGES } from '@/lib/constants'
import { notify } from '@/lib/notify'
import { requireInstallAccess, requireManager, requireProjectAccess, requireAuth } from '@/lib/auth/guards'
import { purgeFiles } from '@/lib/file-cleanup'

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
  const guard = await requireInstallAccess()
  if ('error' in guard) return { error: 'متاح لمدير التركيبات ومهندس إدارة المشاريع فقط' as const }
  return { user: { id: guard.ctx.userId } }
}

// Every file uploaded anywhere in the installation section is also registered in
// `documents` so it shows up in the project's Attachments tab.
async function registerDocument(
  service: ReturnType<typeof createServiceClient>,
  projectId: string, userId: string, url: string, description: string,
) {
  await service.from('documents').insert({
    project_id: projectId, type: 'other', url, uploaded_by: userId, description,
  } as never)
}

// Removing a file from a stage removes it everywhere: Attachments tab + storage.
async function unregisterDocument(
  service: ReturnType<typeof createServiceClient>, projectId: string, url: string,
) {
  await purgeFiles(service, projectId, [url])
}

async function getStages(service: ReturnType<typeof createServiceClient>, installationId: string): Promise<InstallationStages> {
  const cur = (await service
    .from('installations').select('stages').eq('id', installationId).single()) as unknown as {
      data: { stages: InstallationStages | null } | null
    }
  return cur.data?.stages ?? {}
}

export async function getProjectInstallations(projectId: string) {
  const guard = await requireProjectAccess(projectId)
  if ('error' in guard) return []
  const supabase = await createClient()
  const result = (await supabase
    .from('installations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })) as QueryResultMany<Installation>
  return result.data ?? []
}

export async function getAllInstallations() {
  const guard = await requireAuth()
  if ('error' in guard) return []
  const supabase = await createClient()
  // Completed rows are included so the dashboard's "مكتمل" counter is real;
  // the schedule list filters them out client-side.
  const result = (await supabase
    .from('installations')
    .select('*, project:projects(id, client_name, project_name, installation_id)')
    .order('scheduled_date', { ascending: true })) as QueryResultMany<Installation & { project: { id: string; client_name: string; project_name: string; installation_id: string | null } }>
  return result.data ?? []
}

// ── Projects as the installation manager sees them ──
// Like coordinators: my own projects in full, colleagues' projects visible
// only as "existing" (name + manager + status — no details, not clickable).
export interface MyInstallProject {
  id: string
  project_name: string
  client_name: string
  status: string
  has_installation: boolean
  start_date: string | null
  expected_end_date: string | null
}
export interface ColleagueInstallProject {
  id: string
  project_name: string
  status: string
  manager_name: string
}

export async function getInstallationProjects(): Promise<{ mine: MyInstallProject[]; colleagues: ColleagueInstallProject[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { mine: [], colleagues: [] }

  const service = createServiceClient()
  const result = (await service
    .from('projects')
    .select('id, project_name, client_name, status, has_installation, start_date, expected_end_date, installation_id, installation_person:profiles!installation_id(full_name)')
    .not('installation_id', 'is', null)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })) as unknown as {
      data: (MyInstallProject & { installation_id: string; installation_person: { full_name: string } | null })[] | null
    }

  const rows = result.data ?? []
  return {
    mine: rows.filter((p) => p.installation_id === user.id)
      .map(({ id, project_name, client_name, status, has_installation, start_date, expected_end_date }) =>
        ({ id, project_name, client_name, status, has_installation, start_date, expected_end_date })),
    colleagues: rows.filter((p) => p.installation_id !== user.id)
      .map((p) => ({ id: p.id, project_name: p.project_name, status: p.status, manager_name: p.installation_person?.full_name ?? '—' })),
  }
}

export async function scheduleInstallation(formData: FormData) {
  // Scheduling is a manager action — the other 11 installation writers already
  // went through requireInstallEditor; these three did not.
  const guard = await requireManager()
  if ('error' in guard) return { error: 'جدولة التركيب متاحة لمهندس إدارة المشاريع والإدارة فقط' }
  const user = { id: guard.ctx.userId }

  const projectId = formData.get('project_id') as string
  const scheduledDate = formData.get('scheduled_date') as string
  const expectedEndDate = (formData.get('expected_end_date') as string)?.trim() || null
  const expectedDuration = (formData.get('expected_duration') as string)?.trim() || null

  if (!scheduledDate) return { error: 'يرجى تحديد تاريخ التركيب' }

  const service = createServiceClient()

  const { error } = (await service.from('installations').insert({
    project_id: projectId,
    scheduled_date: scheduledDate,
    expected_end_date: expectedEndDate,
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
    details: { scheduled_date: scheduledDate, expected_end_date: expectedEndDate, expected_duration: expectedDuration },
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

// Edit the schedule dates after they've been set (start + expected finish).
export async function setInstallDates(
  installationId: string, projectId: string, scheduledDate: string | null, expectedEndDate: string | null,
) {
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  if (!scheduledDate) return { error: 'يرجى تحديد تاريخ البدء' }
  if (expectedEndDate && expectedEndDate < scheduledDate) return { error: 'تاريخ الانتهاء المتوقع قبل تاريخ البدء' }

  const service = createServiceClient()
  const { error } = (await service
    .from('installations').update({
      scheduled_date: scheduledDate,
      expected_end_date: expectedEndDate || null,
    } as never)
    .eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حفظ التواريخ' }

  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: 'تعديل مواعيد التركيب',
    details: { installation_id: installationId, scheduled_date: scheduledDate, expected_end_date: expectedEndDate },
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

  // Also surface it in the project's Attachments tab
  await registerDocument(service, projectId, auth.user.id, file.url,
    `التركيب — ${stageLabel(stageKey)}${file.slot ? ` / ${file.slot}` : ''}: ${file.name}`)

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
  const removed = (stage.files ?? []).find((f) => f.url === url)
  stage.files = (stage.files ?? []).filter((f) => f.url !== url)
  stages[stageKey] = stage
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف المرفق' }

  await unregisterDocument(service, projectId, url)
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `حذف مرفق من مرحلة التركيب — ${stageLabel(stageKey)}: ${removed?.name ?? ''}`,
    details: { installation_id: installationId, stage: stageKey, file: removed?.name ?? null },
  } as never)

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
    action: `إضافة بند معاينة — ${stageLabel(stageKey)}: ${label.trim()}`,
    details: { installation_id: installationId, stage: stageKey, label: label.trim() },
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
  const slotLabel = (stage.customSlots ?? []).find((s) => s.key === slotKey)?.label ?? slotKey
  const droppedFiles = (stage.files ?? []).filter((f) => f.slot === slotKey)
  stage.customSlots = (stage.customSlots ?? []).filter((s) => s.key !== slotKey)
  stage.files = (stage.files ?? []).filter((f) => f.slot !== slotKey)  // drop files under removed slot
  if (stage.slotStates) { const ss = { ...stage.slotStates }; delete ss[slotKey]; stage.slotStates = ss }
  stages[stageKey] = stage
  const { error } = (await service
    .from('installations').update({ stages } as never).eq('id', installationId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل حذف البند' }

  for (const f of droppedFiles) await unregisterDocument(service, projectId, f.url)
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `حذف بند معاينة — ${stageLabel(stageKey)}: ${slotLabel}`,
    details: { installation_id: installationId, stage: stageKey, slot: slotKey, files_removed: droppedFiles.length },
  } as never)

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

  // Rejection evidence also lands in the project's Attachments tab
  for (const f of files) {
    await registerDocument(service, projectId, auth.user.id, f.url,
      `رفض ${stageLabel(stageKey)} / ${slotKey}: ${f.name}`)
  }

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

  // Rejection evidence also lands in the project's Attachments tab
  for (const f of files) {
    await registerDocument(service, projectId, auth.user.id, f.url,
      `رفض ${stageLabel(stageKey)}: ${f.name}`)
  }

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
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const user = auth.user

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
  const auth = await requireInstallEditor()
  if ('error' in auth) return { error: auth.error }
  const user = auth.user

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
