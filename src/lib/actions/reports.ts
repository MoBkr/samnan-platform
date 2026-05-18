'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Project, Payment, ActivityLog } from '@/types/database'
import type { QueryResultMany } from '@/lib/supabase/typed'

export type ProjectReport = Project & {
  coordinator?: Pick<Profile, 'full_name'> | null
  sales_engineer?: Pick<Profile, 'full_name'> | null
  installation_person?: Pick<Profile, 'full_name'> | null
}

export type PaymentReport = Payment & {
  project: { client_name: string; project_name: string }
}

export type ActivityLogReport = ActivityLog & {
  user?: Pick<Profile, 'full_name'> | null
  project?: { project_name: string; client_name: string } | null
}

export async function getProjectsReport(): Promise<ProjectReport[]> {
  const supabase = await createClient()
  const result = (await supabase
    .from('projects')
    .select('*, coordinator:profiles!coordinator_id(full_name), sales_engineer:profiles!sales_engineer_id(full_name)')
    .order('created_at', { ascending: false })) as QueryResultMany<ProjectReport>
  return result.data ?? []
}

export async function getPaymentsReport(): Promise<PaymentReport[]> {
  const supabase = await createClient()
  const result = (await supabase
    .from('payments')
    .select('*, project:projects(client_name, project_name)')
    .order('created_at', { ascending: false })) as QueryResultMany<PaymentReport>
  return result.data ?? []
}

export async function getTeamReport(): Promise<Profile[]> {
  const supabase = await createClient()
  const result = (await supabase
    .from('profiles')
    .select('*')
    .order('role')
    .order('full_name')) as QueryResultMany<Profile>
  return result.data ?? []
}

export async function getActivityLogReport(): Promise<ActivityLogReport[]> {
  const supabase = await createClient()
  const result = (await supabase
    .from('activity_log')
    .select('*, user:profiles(full_name), project:projects(project_name, client_name)')
    .order('created_at', { ascending: false })
    .limit(300)) as QueryResultMany<ActivityLogReport>
  return result.data ?? []
}
