import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import type { QueryResult } from '@/lib/supabase/typed'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const result = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as QueryResult<Profile>

  if (!result.data) {
    redirect('/login')
  }

  return <DashboardShell profile={result.data}>{children}</DashboardShell>
}
