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

// ── Annual summary — yearly stats the business owner cares about ──
export interface AnnualYearStats {
  year: number
  projectsCreated: number
  projectsCompleted: number
  projectsCancelled: number
  deliveriesConfirmed: number   // materials deliveries confirmed by a delivery note
  installationsCompleted: number
  collected: number             // amount collected during the year
  newContractsValue: number     // total value of projects created during the year
}

export interface AnnualSummary {
  years: number[]
  byYear: Record<number, AnnualYearStats>
  currentActive: number         // projects currently active (not year-bound)
}

const yearOf = (iso: string | null): number | null => {
  if (!iso) return null
  const y = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Riyadh', year: 'numeric' }).format(new Date(iso))
  return Number(y)
}

export async function getAnnualSummary(): Promise<AnnualSummary> {
  const supabase = await createClient()

  const [projRes, payRes, docRes, instRes] = await Promise.all([
    supabase.from('projects').select('status, total_amount, created_at, updated_at') as unknown as Promise<QueryResultMany<Pick<Project, 'status' | 'total_amount' | 'created_at' | 'updated_at'>>>,
    supabase.from('payments').select('paid_amount, paid_at, status') as unknown as Promise<QueryResultMany<Pick<Payment, 'paid_amount' | 'paid_at' | 'status'>>>,
    supabase.from('documents').select('type, uploaded_at').eq('type', 'delivery_note') as unknown as Promise<QueryResultMany<{ type: string; uploaded_at: string }>>,
    supabase.from('installations').select('status, completed_at') as unknown as Promise<QueryResultMany<{ status: string; completed_at: string | null }>>,
  ])

  const byYear: Record<number, AnnualYearStats> = {}
  const ensure = (y: number): AnnualYearStats => (byYear[y] ??= {
    year: y, projectsCreated: 0, projectsCompleted: 0, projectsCancelled: 0,
    deliveriesConfirmed: 0, installationsCompleted: 0, collected: 0, newContractsValue: 0,
  })

  let currentActive = 0
  for (const p of projRes.data ?? []) {
    if (p.status === 'active' || p.status === 'on_hold') currentActive++
    const cy = yearOf(p.created_at)
    if (cy) { const s = ensure(cy); s.projectsCreated++; s.newContractsValue += Number(p.total_amount ?? 0) }
    // Completion/cancellation date isn't stored separately — use updated_at as the event date.
    const uy = yearOf(p.updated_at)
    if (uy) {
      if (p.status === 'completed') ensure(uy).projectsCompleted++
      else if (p.status === 'cancelled') ensure(uy).projectsCancelled++
    }
  }

  for (const p of payRes.data ?? []) {
    const y = yearOf(p.paid_at)
    if (y && (p.paid_amount ?? 0) > 0) ensure(y).collected += Number(p.paid_amount ?? 0)
  }

  // A delivery is only confirmed once the client's delivery note is uploaded.
  for (const d of docRes.data ?? []) {
    const y = yearOf(d.uploaded_at)
    if (y) ensure(y).deliveriesConfirmed++
  }

  for (const i of instRes.data ?? []) {
    if (i.status !== 'completed') continue
    const y = yearOf(i.completed_at)
    if (y) ensure(y).installationsCompleted++
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)
  // Always include the current year so an empty year still renders.
  const thisYear = new Date().getFullYear()
  if (!years.includes(thisYear)) { ensure(thisYear); years.unshift(thisYear) }

  return { years, byYear, currentActive }
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
