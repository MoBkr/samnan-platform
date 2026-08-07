'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { AppNotification } from '@/types/database'

export async function getMyNotifications(): Promise<{ items: AppNotification[]; unread: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], unread: 0 }

  // Reminders are dispatched by the scheduled job at /api/cron/reminders —
  // they used to run inline here on every 30s poll from every open tab, which
  // meant hundreds of sequential queries per request, reminders lost whenever
  // the function timed out mid-loop, and nothing sent at all when no one had
  // the app open.

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
