'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notify } from '@/lib/notify'
import { removeStorageFiles } from '@/lib/file-cleanup'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

type Service = ReturnType<typeof createServiceClient>

/** Management must see who changed what about their own account. */
async function auditAccountChange(
  service: Service, userId: string, userName: string, action: string, details: Record<string, unknown> = {},
) {
  await service.from('activity_log').insert({
    project_id: null, user_id: userId, action, details,
  } as never)

  const admins = (await service
    .from('profiles').select('id').eq('role', 'admin').eq('is_active', true)) as QueryResultMany<{ id: string }>

  await notify(
    (admins.data ?? []).map((a) => a.id),
    { title: 'تعديل على بيانات حساب', body: `${userName}: ${action}`, link: '/users', type: 'info' },
    userId, // don't notify an admin about their own change
  )
}

export async function getMyAccount(): Promise<{ profile: Profile; email: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const r = (await supabase
    .from('profiles').select('*').eq('id', user.id).single()) as QueryResult<Profile>
  if (!r.data) return null

  return { profile: r.data, email: user.email ?? '' }
}

export async function updateMyProfile(data: { fullName?: string; phone?: string | null; avatarUrl?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const cur = (await service
    .from('profiles').select('full_name, phone, avatar_url').eq('id', user.id).single()) as QueryResult<{
      full_name: string; phone: string | null; avatar_url: string | null
    }>
  if (!cur.data) return { error: 'الحساب غير موجود' }

  const patch: Record<string, unknown> = {}
  const changes: string[] = []

  if (data.fullName !== undefined) {
    const name = data.fullName.trim()
    if (name.length < 3) return { error: 'الاسم قصير جداً' }
    if (name !== cur.data.full_name) {
      patch.full_name = name
      changes.push(`تغيير الاسم من «${cur.data.full_name}» إلى «${name}»`)
    }
  }
  if (data.phone !== undefined) {
    const phone = data.phone?.trim() || null
    if (phone !== cur.data.phone) {
      patch.phone = phone
      changes.push('تحديث رقم الجوال')
    }
  }
  if (data.avatarUrl !== undefined) {
    patch.avatar_url = data.avatarUrl
    changes.push(data.avatarUrl ? 'تغيير الصورة الشخصية' : 'حذف الصورة الشخصية')
  }

  if (!Object.keys(patch).length) return { success: true }

  const { error } = (await service
    .from('profiles').update(patch as never).eq('id', user.id)) as unknown as { error: { message?: string } | null }
  if (error) {
    console.error('[updateMyProfile]', error)
    return { error: `فشل الحفظ — ${error.message ?? ''}`.trim() }
  }

  // The old avatar file is now unreachable — don't leave it in storage.
  if (data.avatarUrl !== undefined && cur.data.avatar_url && cur.data.avatar_url !== data.avatarUrl) {
    await removeStorageFiles(service, [cur.data.avatar_url])
  }

  // Renaming yourself is identity-level; the picture isn't. Only tell the
  // admins about the things that matter.
  const name = (patch.full_name as string) ?? cur.data.full_name
  for (const c of changes) {
    if (c.startsWith('تغيير الاسم') || c.startsWith('تحديث رقم')) {
      await auditAccountChange(service, user.id, name, c)
    }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'غير مصرح' }

  if (!newPassword || newPassword.length < 6) return { error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' }
  if (newPassword === currentPassword) return { error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية' }

  // Prove it's really you — otherwise anyone on an open session could lock the
  // owner out of their own account.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email, password: currentPassword,
  })
  if (signInError) return { error: 'كلمة المرور الحالية غير صحيحة' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    if (error.message.includes('should be different')) {
      return { error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية' }
    }
    return { error: 'تعذّر تغيير كلمة المرور. حاول مرة أخرى' }
  }

  const service = createServiceClient()
  const p = (await service
    .from('profiles').select('full_name').eq('id', user.id).single()) as QueryResult<{ full_name: string }>
  await auditAccountChange(service, user.id, p.data?.full_name ?? '', 'تغيير كلمة المرور')

  return { success: true }
}
