'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { AppNotification } from '@/types/database'

// Reminders have two triggers:
//  1. /api/cron/reminders — the guaranteed baseline. It runs even when nobody
//     has the app open, which the old design could not do. The Vercel Hobby
//     plan allows one scheduled run per day, so it fires at 06:00 Riyadh.
//  2. This throttled fallback — so an item that becomes due during the working
//     day is still announced without waiting for tomorrow's run.
//
// The fallback used to run on EVERY 30-second poll from EVERY open tab: ~700
// sequential queries per request, and reminders permanently lost when the
// function was killed mid-loop (rows are claimed before they are sent). The
// throttle below collapses that to at most one dispatch per instance per
// window, and the existing claim-based idempotency keeps concurrent instances
// from double-sending.
const DISPATCH_WINDOW_MS = 10 * 60 * 1000
let lastDispatchAt = 0

async function dispatchRemindersThrottled() {
  const now = Date.now()
  if (now - lastDispatchAt < DISPATCH_WINDOW_MS) return
  lastDispatchAt = now
  try {
    const { dispatchDueReminders } = await import('@/lib/actions/notes')
    await dispatchDueReminders()
  } catch (e) {
    console.error('[reminders] notes', e)
  }
  try {
    const { dispatchDuePaymentReminders } = await import('@/lib/actions/payments')
    await dispatchDuePaymentReminders()
  } catch (e) {
    console.error('[reminders] payments', e)
  }
}

export async function getMyNotifications(): Promise<{ items: AppNotification[]; unread: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], unread: 0 }

  await dispatchRemindersThrottled()

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
