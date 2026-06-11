'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { UserRole } from '@/types/database'
import { ROLE_REDIRECTS } from '@/lib/constants'
import type { QueryResult } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

async function getOrigin() {
  const h = await headers()
  const origin = h.get('origin')
  if (origin) return origin
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
    }
    return { error: 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'حدث خطأ. حاول مرة أخرى' }

  const result = (await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: UserRole; is_active: boolean }>

  // Block accounts that are pending approval or deactivated by an admin.
  if (result.data && result.data.is_active === false) {
    await supabase.auth.signOut()
    return { error: 'حسابك قيد المراجعة من الإدارة. سيتم تفعيله بعد الموافقة عليه.' }
  }

  const role = result.data?.role ?? 'coordinator'
  revalidatePath('/', 'layout')
  return { redirectTo: ROLE_REDIRECTS[role] ?? '/dashboard' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'يرجى إدخال البريد الإلكتروني' }

  const origin = await getOrigin()
  const supabase = await createClient()

  // Send the reset email. We intentionally always return success (even if the
  // email isn't registered) so we never reveal which emails exist in the system.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  return { success: true }
}

export async function createUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as UserRole

  if (!email || !password || !fullName || !role) {
    return { error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  const service = createServiceClient()

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName, role },
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'هذا البريد الإلكتروني مسجل مسبقاً' }
    }
    return { error: 'فشل إنشاء المستخدم. حاول مرة أخرى' }
  }

  if (data.user) {
    // Admin-created accounts are pre-approved (active immediately).
    await (service
      .from('profiles')
      .upsert({ id: data.user.id, full_name: fullName, role, is_active: true } as never) as unknown as Promise<{ error: Error | null }>)
  }

  revalidatePath('/users')
  return { success: true }
}

export async function approveUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  if (profileResult.data?.role !== 'admin') return { error: 'الموافقة متاحة للإدارة فقط' }

  const service = createServiceClient()
  const { error } = (await service
    .from('profiles')
    .update({ is_active: true } as never)
    .eq('id', userId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تفعيل الحساب' }

  revalidatePath('/users')
  return { success: true }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const service = createServiceClient()

  const { error } = (await service
    .from('profiles')
    .update({ role } as never)
    .eq('id', userId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث الدور' }

  revalidatePath('/users')
  return { success: true }
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as UserRole

  if (!email || !password || !fullName || !role) {
    return { error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  if (password.length < 6) {
    return { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }
  }

  const service = createServiceClient()

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName, role },
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'هذا البريد الإلكتروني مسجل مسبقاً' }
    }
    return { error: 'فشل إنشاء الحساب. حاول مرة أخرى' }
  }

  if (data.user) {
    // New self-signups start INACTIVE — an admin must approve them before they
    // can log in. This ensures only real company members get platform access.
    await (service
      .from('profiles')
      .upsert({ id: data.user.id, full_name: fullName, role, is_active: false } as never) as unknown as Promise<{ error: Error | null }>)
  }

  // Do NOT sign the user in — the account is pending admin approval.
  return { pending: true }
}

// ── Forgot-password: request reset from the manager (no auth, public) ──
export async function requestAdminPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const fullName = ((formData.get('full_name') as string) ?? '').trim()
  if (!email) return { error: 'يرجى إدخال البريد الإلكتروني' }

  const service = createServiceClient()

  // SECURITY: only create a request for an email that actually belongs to an
  // active platform account — and never for admin accounts (admins recover via
  // email only). We always return a generic success either way so the form
  // can't be used to enumerate which emails exist.
  const userId = await findAuthUserIdByEmail(service, email)
  if (userId) {
    const profileRes = (await service
      .from('profiles').select('role, is_active').eq('id', userId).single()) as unknown as {
        data: { role: string; is_active: boolean } | null
      }
    const profile = profileRes.data

    const eligible = profile && profile.is_active !== false && profile.role !== 'admin'
    if (eligible) {
      // Avoid duplicate pending requests for the same email
      const existing = (await service
        .from('password_reset_requests')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .limit(1)) as unknown as { data: { id: string }[] | null }

      if (!existing.data || existing.data.length === 0) {
        await (service
          .from('password_reset_requests')
          .insert({ email, full_name: fullName || null, status: 'pending' } as never) as unknown as Promise<unknown>)
      }
    }
  }

  // Always succeed (never reveal whether the email exists or its role)
  return { success: true }
}

async function findAuthUserIdByEmail(service: ReturnType<typeof createServiceClient>, email: string): Promise<string | null> {
  // Internal team is small — scan the auth user list and match by email.
  const target = email.trim().toLowerCase()
  let page = 1
  // Up to 10 pages of 1000 = 10k users; far beyond an internal team.
  while (page <= 10) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) return null
    const match = data.users.find((u) => u.email?.toLowerCase() === target)
    if (match) return match.id
    if (data.users.length < 1000) return null
    page++
  }
  return null
}

export async function getPendingResetRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  if (profileResult.data?.role !== 'admin') return []

  const service = createServiceClient()
  const result = (await service
    .from('password_reset_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })) as unknown as { data: import('@/types/database').PasswordResetRequest[] | null }
  return result.data ?? []
}

export async function resolveResetRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  if (profileResult.data?.role !== 'admin') return { error: 'متاح للإدارة فقط' }

  const service = createServiceClient()

  const reqResult = (await service
    .from('password_reset_requests').select('*').eq('id', requestId).single()) as unknown as { data: import('@/types/database').PasswordResetRequest | null }
  const req = reqResult.data
  if (!req) return { error: 'الطلب غير موجود' }

  const targetId = await findAuthUserIdByEmail(service, req.email)
  if (!targetId) {
    return { error: 'لا يوجد حساب مسجّل بهذا البريد الإلكتروني' }
  }

  // Generate a strong password
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let newPassword = ''
  for (let i = 0; i < 10; i++) newPassword += chars[Math.floor(Math.random() * chars.length)]

  const { error: pwError } = await service.auth.admin.updateUserById(targetId, { password: newPassword })
  if (pwError) return { error: 'فشل إعادة تعيين كلمة المرور' }

  // Mark request resolved
  await (service
    .from('password_reset_requests')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id } as never)
    .eq('id', requestId) as unknown as Promise<unknown>)

  // Email the new password to the employee
  const { sendNewPasswordEmail } = await import('@/lib/email')
  const mail = await sendNewPasswordEmail(req.email, req.full_name, newPassword)

  revalidatePath('/users')
  return { success: true, password: newPassword, emailSent: mail.sent, emailSkipped: mail.skipped ?? false }
}

export async function adminResetUserPassword(targetUserId: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const profileResult = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: string }>

  if (profileResult.data?.role !== 'admin') return { error: 'إعادة التعيين متاحة للإدارة فقط' }
  if (!newPassword || newPassword.length < 6) {
    return { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }
  }

  const service = createServiceClient()
  const { error } = await service.auth.admin.updateUserById(targetUserId, { password: newPassword })

  if (error) return { error: 'فشل إعادة تعيين كلمة المرور. حاول مرة أخرى' }

  return { success: true }
}

export async function deleteUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const profileResult = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: string }>

  if (profileResult.data?.role !== 'admin') return { error: 'الحذف متاح للإدارة فقط' }
  if (user.id === targetUserId) return { error: 'لا يمكنك حذف حسابك الخاص' }

  const service = createServiceClient()

  // Detach user from any projects before deletion
  await service.from('projects').update({ coordinator_id: null } as never).eq('coordinator_id', targetUserId)
  await service.from('projects').update({ sales_engineer_id: null } as never).eq('sales_engineer_id', targetUserId)
  await service.from('projects').update({ installation_id: null } as never).eq('installation_id', targetUserId)

  // Delete profile record first (avoids FK constraint when deleting auth user)
  const { error: profileError } = await service
    .from('profiles')
    .delete()
    .eq('id', targetUserId)

  if (profileError) return { error: 'فشل حذف بيانات المستخدم' }

  // Delete auth user
  const { error: authError } = await service.auth.admin.deleteUser(targetUserId)
  if (authError) return { error: 'فشل حذف حساب تسجيل الدخول. حاول مرة أخرى' }

  revalidatePath('/users')
  return { success: true }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const result = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as QueryResult<Profile>

  if (!result.data) {
    // Auth session exists but profile was deleted — sign out to prevent redirect loop
    await supabase.auth.signOut()
    return null
  }

  // Account deactivated / pending approval — revoke the session.
  if (result.data.is_active === false) {
    await supabase.auth.signOut()
    return null
  }

  return result.data
}
