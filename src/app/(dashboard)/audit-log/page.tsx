import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getAuditLog } from '@/lib/actions/audit'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { AuditLogView } from '@/components/audit/audit-log-view'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export default async function AuditLogPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'coordinator' && profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [{ logs, brs }, usersRes] = await Promise.all([
    getAuditLog(),
    supabase.from('profiles').select('id, full_name, role') as unknown as Promise<QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>>,
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="سجل التدقيق" description="كل عملية تتم على المنصة — من قام بها، ومتى (بتوقيت السعودية)" />
      <AuditLogView logs={logs} brs={brs} users={usersRes.data ?? []} />
    </div>
  )
}
