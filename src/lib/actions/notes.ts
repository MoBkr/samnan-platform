'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notify } from '@/lib/actions/notifications'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import type { ProjectNote, PersonalNote, NoteKind, Profile } from '@/types/database'

type Service = ReturnType<typeof createServiceClient>

const KIND_LABEL: Record<NoteKind, string> = {
  note: 'ملاحظة',
  schedule: 'موعد',
  reminder: 'تذكير',
  todo: 'مهمة',
}

async function me() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const p = (await supabase
    .from('profiles').select('id, full_name, role').eq('id', user.id).single()) as QueryResult<Pick<Profile, 'id' | 'full_name' | 'role'>>
  return p.data ?? null
}

/**
 * Who belongs to a project's board: the people responsible for it (sales
 * engineer, installation manager, its coordinator) plus every coordinator and
 * every admin — per the client's rule "المسؤولين عن المشروع، والكوردنيتورز كلهم".
 */
export async function getBoardMembers(projectId: string): Promise<Pick<Profile, 'id' | 'full_name' | 'role'>[]> {
  const service = createServiceClient()
  const proj = (await service
    .from('projects').select('coordinator_id, sales_engineer_id, installation_id').eq('id', projectId).single()) as QueryResult<{
      coordinator_id: string | null; sales_engineer_id: string | null; installation_id: string | null
    }>
  if (!proj.data) return []

  const all = (await service
    .from('profiles').select('id, full_name, role').eq('is_active', true)) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>

  const assigned = new Set([proj.data.coordinator_id, proj.data.sales_engineer_id, proj.data.installation_id].filter(Boolean) as string[])
  return (all.data ?? []).filter((p) =>
    p.role === 'admin' || p.role === 'coordinator' || assigned.has(p.id),
  )
}

async function memberIds(service: Service, projectId: string): Promise<string[]> {
  const members = await getBoardMembers(projectId)
  return members.map((m) => m.id)
}

async function isMember(projectId: string, userId: string) {
  const ids = await memberIds(createServiceClient(), projectId)
  return ids.includes(userId)
}

export async function getProjectNotes(projectId: string): Promise<ProjectNote[]> {
  const service = createServiceClient()
  const r = (await service
    .from('project_notes')
    .select('*, author:profiles!author_id(id, full_name, role)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })) as QueryResultMany<ProjectNote>
  return r.data ?? []
}

export async function addProjectNote(data: {
  projectId: string
  kind: NoteKind
  body: string
  dueAt?: string | null
  mentions?: string[]
}) {
  const profile = await me()
  if (!profile) return { error: 'غير مصرح' }
  if (!(await isMember(data.projectId, profile.id))) return { error: 'أنت لست ضمن فريق هذا المشروع' }
  if (!data.body?.trim()) return { error: 'اكتب الرسالة' }
  if (data.kind !== 'note' && !data.dueAt) return { error: 'حدد التاريخ والوقت' }

  const service = createServiceClient()
  const mentions = Array.from(new Set(data.mentions ?? []))

  const { error } = (await service.from('project_notes').insert({
    project_id: data.projectId,
    author_id: profile.id,
    kind: data.kind,
    body: data.body.trim(),
    due_at: data.dueAt || null,
    mentions,
  } as never)) as unknown as { error: { message?: string } | null }

  if (error) {
    console.error('[addProjectNote]', error)
    return { error: `فشل النشر — ${error.message ?? ''}`.trim() }
  }

  const proj = (await service
    .from('projects').select('project_name').eq('id', data.projectId).single()) as QueryResult<{ project_name: string }>
  const projectName = proj.data?.project_name ?? ''
  const link = `/projects/${data.projectId}`
  const preview = data.body.trim().slice(0, 80)

  // Mentions get their own, louder notification; everyone else gets the post.
  if (mentions.length) {
    await notify(mentions, {
      title: `${profile.full_name} ذكرك في ${projectName}`,
      body: preview, link, type: 'note', projectId: data.projectId,
    }, profile.id)
  }

  const others = (await memberIds(service, data.projectId)).filter((id) => !mentions.includes(id))
  if (data.kind !== 'note') {
    await notify(others, {
      title: `${KIND_LABEL[data.kind]} جديد في ${projectName}`,
      body: preview, link, type: 'note', projectId: data.projectId,
    }, profile.id)
  }

  await service.from('activity_log').insert({
    project_id: data.projectId, user_id: profile.id,
    action: `${KIND_LABEL[data.kind]} في مدونة المشروع: ${preview}`,
    details: { kind: data.kind, due_at: data.dueAt ?? null, mentions },
  } as never)

  revalidatePath(`/projects/${data.projectId}`)
  return { success: true }
}

export async function toggleProjectNoteDone(id: string, projectId: string, done: boolean) {
  const profile = await me()
  if (!profile) return { error: 'غير مصرح' }
  if (!(await isMember(projectId, profile.id))) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('project_notes').update({ done } as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل التحديث' }

  const cur = (await service
    .from('project_notes').select('body').eq('id', id).single()) as QueryResult<{ body: string }>
  await service.from('activity_log').insert({
    project_id: projectId, user_id: profile.id,
    action: `${done ? 'إنجاز' : 'إعادة فتح'} مهمة في مدونة المشروع: ${cur.data?.body?.slice(0, 60) ?? ''}`,
    details: { note_id: id, done },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// Only the author or an admin may remove a post.
export async function deleteProjectNote(id: string, projectId: string) {
  const profile = await me()
  if (!profile) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const cur = (await service
    .from('project_notes').select('author_id, body').eq('id', id).single()) as QueryResult<{ author_id: string | null; body: string }>
  if (!cur.data) return { error: 'غير موجود' }
  if (cur.data.author_id !== profile.id && profile.role !== 'admin') {
    return { error: 'يمكن حذف رسائلك فقط' }
  }

  const { error } = (await service
    .from('project_notes').delete().eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل الحذف' }

  await service.from('activity_log').insert({
    project_id: projectId, user_id: profile.id,
    action: `حذف رسالة من مدونة المشروع: ${cur.data.body.slice(0, 60)}`,
    details: { note_id: id },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ─────────────────────────── Personal notebook ───────────────────────────

export async function getPersonalNotes(ownerId?: string): Promise<PersonalNote[]> {
  const profile = await me()
  if (!profile) return []
  // Only admins may look at someone else's notebook — and never silently.
  const target = ownerId && profile.role === 'admin' ? ownerId : profile.id

  const service = createServiceClient()
  const r = (await service
    .from('personal_notes')
    .select('*, owner:profiles!owner_id(id, full_name, role)')
    .eq('owner_id', target)
    .order('created_at', { ascending: false })) as QueryResultMany<PersonalNote>

  if (target !== profile.id) {
    const owner = (await service
      .from('profiles').select('full_name').eq('id', target).single()) as QueryResult<{ full_name: string }>
    await service.from('activity_log').insert({
      project_id: null, user_id: profile.id,
      action: `اطلاع الإدارة على المدونة الشخصية لـ ${owner.data?.full_name ?? ''}`,
      details: { owner_id: target },
    } as never)
  }

  return r.data ?? []
}

export async function addPersonalNote(data: { kind: NoteKind; body: string; dueAt?: string | null }) {
  const profile = await me()
  if (!profile) return { error: 'غير مصرح' }
  if (!data.body?.trim()) return { error: 'اكتب الملاحظة' }
  if (data.kind !== 'note' && !data.dueAt) return { error: 'حدد التاريخ والوقت' }

  const service = createServiceClient()
  const { error } = (await service.from('personal_notes').insert({
    owner_id: profile.id,
    kind: data.kind,
    body: data.body.trim(),
    due_at: data.dueAt || null,
  } as never)) as unknown as { error: { message?: string } | null }

  if (error) {
    console.error('[addPersonalNote]', error)
    return { error: `فشل الحفظ — ${error.message ?? ''}`.trim() }
  }

  revalidatePath('/notebook')
  return { success: true }
}

export async function togglePersonalNoteDone(id: string, done: boolean) {
  const profile = await me()
  if (!profile) return { error: 'غير مصرح' }
  const service = createServiceClient()
  const { error } = (await service
    .from('personal_notes').update({ done } as never)
    .eq('id', id).eq('owner_id', profile.id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل التحديث' }
  revalidatePath('/notebook')
  return { success: true }
}

export async function deletePersonalNote(id: string) {
  const profile = await me()
  if (!profile) return { error: 'غير مصرح' }
  const service = createServiceClient()
  // Owner only — an admin can read a notebook but not rewrite it.
  const { error } = (await service
    .from('personal_notes').delete()
    .eq('id', id).eq('owner_id', profile.id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل الحذف' }
  revalidatePath('/notebook')
  return { success: true }
}

// Admins pick whose notebook to read.
export async function getNotebookUsers(): Promise<Pick<Profile, 'id' | 'full_name' | 'role'>[]> {
  const profile = await me()
  if (!profile || profile.role !== 'admin') return []
  const service = createServiceClient()
  const r = (await service
    .from('profiles').select('id, full_name, role').eq('is_active', true)
    .order('full_name')) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>
  return r.data ?? []
}

// ─────────────────────────── Due reminders ───────────────────────────

/**
 * Fires the reminders whose time has come. There is no cron on this stack, so
 * it piggybacks on the notification poll every client already runs — and
 * `reminded_at` keeps it idempotent no matter how many clients call it.
 */
export async function dispatchDueReminders() {
  const service = createServiceClient()
  const now = new Date().toISOString()

  try {
    const due = (await service
      .from('project_notes')
      .select('id, project_id, kind, body, author_id, mentions')
      .lte('due_at', now).is('reminded_at', null).eq('done', false)
      .limit(50)) as QueryResultMany<Pick<ProjectNote, 'id' | 'project_id' | 'kind' | 'body' | 'author_id' | 'mentions'>>

    for (const n of due.data ?? []) {
      // Claim it first, so two concurrent polls can't both send it.
      const claimed = (await service
        .from('project_notes').update({ reminded_at: now } as never)
        .eq('id', n.id).is('reminded_at', null).select('id')) as QueryResultMany<{ id: string }>
      if (!claimed.data?.length) continue

      const proj = (await service
        .from('projects').select('project_name').eq('id', n.project_id).single()) as QueryResult<{ project_name: string }>
      await notify(await memberIds(service, n.project_id), {
        title: `${KIND_LABEL[n.kind]}: ${proj.data?.project_name ?? ''}`,
        body: n.body.slice(0, 100),
        link: `/projects/${n.project_id}`,
        type: 'note',
        projectId: n.project_id,
      })
    }
  } catch (e) {
    console.error('[dispatchDueReminders:project]', e)
  }

  try {
    const due = (await service
      .from('personal_notes')
      .select('id, owner_id, kind, body')
      .lte('due_at', now).is('reminded_at', null).eq('done', false)
      .limit(50)) as QueryResultMany<Pick<PersonalNote, 'id' | 'owner_id' | 'kind' | 'body'>>

    for (const n of due.data ?? []) {
      const claimed = (await service
        .from('personal_notes').update({ reminded_at: now } as never)
        .eq('id', n.id).is('reminded_at', null).select('id')) as QueryResultMany<{ id: string }>
      if (!claimed.data?.length) continue

      await notify(n.owner_id, {
        title: `${KIND_LABEL[n.kind]} من مدونتك`,
        body: n.body.slice(0, 100),
        link: '/notebook',
        type: 'note',
      })
    }
  } catch (e) {
    console.error('[dispatchDueReminders:personal]', e)
  }
}
