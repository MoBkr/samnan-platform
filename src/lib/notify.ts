// ─── Internal notification helper ───
//
// Deliberately NOT in a `'use server'` module. When this lived in
// actions/notifications.ts it was an exported server action, which made it a
// publicly callable endpoint: anyone could push an in-app notification with an
// arbitrary title, body and LINK to every member of staff — a ready-made
// internal phishing channel. As a plain module it is reachable only from
// server code that imports it.

import { createServiceClient } from '@/lib/supabase/service'

export interface NotifyPayload {
  title: string
  body?: string
  link?: string
  type?: string
  projectId?: string
}

/**
 * Create in-app notifications for one or more recipients.
 * `excludeId` skips the actor so people aren't notified of their own actions.
 * Returns false when delivery failed, so callers can surface it if they care.
 */
export async function notify(
  recipientIds: string | null | undefined | (string | null | undefined)[],
  payload: NotifyPayload,
  excludeId?: string,
): Promise<boolean> {
  const ids = (Array.isArray(recipientIds) ? recipientIds : [recipientIds])
    .filter((id): id is string => !!id && id !== excludeId)
  const unique = Array.from(new Set(ids))
  if (unique.length === 0) return true

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

  if (error) {
    console.error('[notify] delivery failed:', error.message, payload.title)
    return false
  }
  return true
}
