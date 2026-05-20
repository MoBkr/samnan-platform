'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { UserRole } from '@/types/database'
import { ROLE_REDIRECTS } from '@/lib/constants'
import type { QueryResult } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

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
    .select('role')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: UserRole }>

  const role = result.data?.role ?? 'coordinator'
  revalidatePath('/', 'layout')
  redirect(ROLE_REDIRECTS[role] ?? '/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
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
    await (service
      .from('profiles')
      .upsert({ id: data.user.id, full_name: fullName, role } as never) as unknown as Promise<{ error: Error | null }>)
  }

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
    await (service
      .from('profiles')
      .upsert({ id: data.user.id, full_name: fullName, role } as never) as unknown as Promise<{ error: Error | null }>)
  }

  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  revalidatePath('/', 'layout')
  redirect(ROLE_REDIRECTS[role] ?? '/dashboard')
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

  return result.data
}
