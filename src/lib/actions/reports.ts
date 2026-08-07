'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Project, Payment, ActivityLog } from '@/types/database'
import type { QueryResultMany } from '@/lib/supabase/typed'
import { requireManager } from '@/lib/auth/guards'

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
  const guard = await requireManager()
  if ('error' in guard) return []
  const supabase = await createClient()
  const result = (await supabase
    .from('projects')
    .select('*, coordinator:profiles!coordinator_id(full_name), sales_engineer:profiles!sales_engineer_id(full_name)')
    .order('created_at', { ascending: false })) as QueryResultMany<ProjectReport>
  return result.data ?? []
}

export async function getPaymentsReport(): Promise<PaymentReport[]> {
  const guard = await requireManager()
  if ('error' in guard) return []
  const supabase = await createClient()
  const result = (await supabase
    .from('payments')
    .select('*, project:projects(client_name, project_name)')
    .order('created_at', { ascending: false })) as QueryResultMany<PaymentReport>
  return result.data ?? []
}

export async function getTeamReport(): Promise<Profile[]> {
  const guard = await requireManager()
  if ('error' in guard) return []
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

/**
 * PostgREST silently caps a plain select at 1,000 rows. The annual summary
 * aggregates whole tables, so an uncapped read would quietly under-report
 * revenue the moment the platform passes a thousand payments — with no error
 * anywhere. Page through explicitly instead.
 */
async function fetchAllRows<T>(
  build: (from: number, to: number) => Promise<{ data: T[] | null; error?: unknown }>,
): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  for (let page = 0; page < 100; page++) {
    const from = page * PAGE
    const { data } = await build(from, from + PAGE - 1)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export async function getAnnualSummary(): Promise<AnnualSummary> {
  const guard = await requireManager()
  if ('error' in guard) return { years: [], byYear: {}, currentActive: 0 }
  const supabase = await createClient()

  const [projects, payments, deliveryDocs, installs] = await Promise.all([
    fetchAllRows<Pick<Project, 'status' | 'total_amount' | 'created_at' | 'updated_at'>>((f, t) =>
      supabase.from('projects').select('status, total_amount, created_at, updated_at').range(f, t) as never),
    fetchAllRows<Pick<Payment, 'paid_amount' | 'paid_at' | 'status'>>((f, t) =>
      supabase.from('payments').select('paid_amount, paid_at, status').range(f, t) as never),
    fetchAllRows<{ type: string; uploaded_at: string }>((f, t) =>
      supabase.from('documents').select('type, uploaded_at').eq('type', 'delivery_note').range(f, t) as never),
    fetchAllRows<{ status: string; completed_at: string | null }>((f, t) =>
      supabase.from('installations').select('status, completed_at').range(f, t) as never),
  ])
  const projRes = { data: projects }
  const payRes = { data: payments }
  const docRes = { data: deliveryDocs }
  const instRes = { data: installs }

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
  const guard = await requireManager()
  if ('error' in guard) return []
  const supabase = await createClient()
  const result = (await supabase
    .from('activity_log')
    .select('*, user:profiles(full_name), project:projects(project_name, client_name)')
    .order('created_at', { ascending: false })
    .limit(300)) as QueryResultMany<ActivityLogReport>
  return result.data ?? []
}
