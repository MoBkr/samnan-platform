import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHeader } from '@/components/shared/page-header'
import { UsersManager } from '@/components/users/users-manager'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export default async function UsersPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const result = (await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })) as QueryResultMany<Profile>

  // Emails live in auth.users, not profiles — admin-only page, service client.
  const service = createServiceClient()
  const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 })
  const emails: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) if (u.email) emails[u.id] = u.email

  return (
    <div className="space-y-6">
      <PageHeader title="إدارة المستخدمين" description="إنشاء وإدارة حسابات المستخدمين" />
      <UsersManager users={result.data ?? []} currentUserId={profile.id} emails={emails} />
    </div>
  )
}
