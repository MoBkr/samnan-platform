import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
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

  return (
    <div className="space-y-6">
      <PageHeader title="إدارة المستخدمين" description="إنشاء وإدارة حسابات المستخدمين" />
      <UsersManager users={result.data ?? []} />
    </div>
  )
}
