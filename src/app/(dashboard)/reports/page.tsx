import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectsReport, getPaymentsReport, getTeamReport, getActivityLogReport } from '@/lib/actions/reports'
import { ReportsView } from '@/components/reports/reports-view'
import type { Profile } from '@/types/database'
import type { QueryResult } from '@/lib/supabase/typed'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as QueryResult<Profile>

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [projects, payments, team, activity] = await Promise.all([
    getProjectsReport(),
    getPaymentsReport(),
    getTeamReport(),
    getActivityLogReport(),
  ])

  return (
    <ReportsView
      projects={projects}
      payments={payments}
      team={team}
      activity={activity}
    />
  )
}
