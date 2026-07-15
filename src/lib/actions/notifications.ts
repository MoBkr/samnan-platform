'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { AppNotification } from '@/types/database'

// Internal helper — create in-app notifications for one or more recipients.
// `excludeId` skips the actor so people don't get notified of their own actions.
export async function notify(
  recipientIds: string | null | undefined | (string | null | undefined)[],
  payload: { title: string; body?: string; link?: string; type?: string; projectId?: string },
  excludeId?: string,
) {
  const ids = (Array.isArray(recipientIds) ? recipientIds : [recipientIds])
    .filter((id): id is string => !!id && id !== excludeId)
  const unique = Array.from(new Set(ids))
  if (unique.length === 0) return

  const service = createServiceClient()
  const { error } = (await service.from('app_notifications').insert(
    unique.map((id) => ({
      recipient_id: id,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      type: payload.type ?? 'info',
      project_id: payload.projectId ?? null,
    })) as never,
  )) as unknown as { error: { message?: string } | null }

  // A silent failure here means people just never hear about anything.
  if (error) console.error('[notify] failed:', error.message, payload)
}

export async function getMyNotifications(): Promise<{ items: AppNotification[]; unread: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], unread: 0 }

  // No cron on this stack — due reminders ride along with the bell's poll.
  // It's idempotent (claims each note before sending), so concurrent polls
  // from several users can't double-send.
  try {
    const { dispatchDueReminders } = await import('@/lib/actions/notes')
    await dispatchDueReminders()
  } catch (e) {
    console.error('[getMyNotifications] reminders', e)
  }
  try {
    const { dispatchDuePaymentReminders } = await import('@/lib/actions/payments')
    await dispatchDuePaymentReminders()
  } catch (e) {
    console.error('[getMyNotifications] payment reminders', e)
  }

  const service = createServiceClient()
  const result = (await service
    .from('app_notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)) as QueryResultMany<AppNotification>
  const items = result.data ?? []
  return { items, unread: items.filter((n) => !n.is_read).length }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const service = createServiceClient()
  await service.from('app_notifications').update({ is_read: true } as never)
    .eq('id', id).eq('recipient_id', user.id)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const service = createServiceClient()
  await service.from('app_notifications').update({ is_read: true } as never)
    .eq('recipient_id', user.id).eq('is_read', false)
  revalidatePath('/dashboard')
  return { success: true }
}
