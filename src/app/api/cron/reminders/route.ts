import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { dispatchDueReminders } from '@/lib/actions/notes'
import { dispatchDuePaymentReminders } from '@/lib/actions/payments'

// Reminders used to run inline inside the notification bell's 30-second poll.
// That meant: hundreds of sequential queries on every poll from every open tab,
// reminders permanently lost whenever the function was killed mid-loop (rows
// are claimed before sending), and — worst — nothing sent at all when nobody
// had the app open. They now run here on a schedule (see vercel.json crons).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Vercel signs cron invocations with CRON_SECRET. When the secret is set we
  // require it, so the endpoint can't be hammered to burn the idempotency
  // claims and silence real reminders.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const started = Date.now()
  const result = { notes: 'ok', payments: 'ok' } as Record<string, string>

  try {
    await dispatchDueReminders()
  } catch (e) {
    console.error('[cron/reminders] notes', e)
    result.notes = 'failed'
  }
  try {
    await dispatchDuePaymentReminders()
  } catch (e) {
    console.error('[cron/reminders] payments', e)
    result.payments = 'failed'
  }

  return NextResponse.json({ ...result, ms: Date.now() - started })
}
