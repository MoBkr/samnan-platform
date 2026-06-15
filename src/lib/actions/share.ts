'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { INSTALL_STAGES } from '@/lib/constants'
import type { QueryResult } from '@/lib/supabase/typed'
import type { Project, Payment, Installation, Material } from '@/types/database'

// ── Generate / fetch the client share token (coordinator, sales, admin) ──
export async function getOrCreateShareToken(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  const role = profileResult.data?.role
  if (role !== 'coordinator' && role !== 'admin' && role !== 'sales_engineer') {
    return { error: 'متاح للكوردنيتر والمبيعات والإدارة فقط' }
  }

  const service = createServiceClient()
  const existing = (await service
    .from('projects').select('public_token').eq('id', projectId).single()) as QueryResult<{ public_token: string | null }>

  let token = existing.data?.public_token
  if (!token) {
    token = randomUUID()
    const { error } = (await service
      .from('projects').update({ public_token: token } as never).eq('id', projectId)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل إنشاء الرابط' }
  }
  return { token }
}

export interface PublicProjectView {
  project_name: string
  client_name: string
  location: string | null
  status: string
  has_installation: boolean
  start_date: string | null
  expected_end_date: string | null
  collection: { total: number; paid: number; pct: number }
  payments: { label: string; status: string }[]
  materials_status: string | null
  installation: { scheduled_date: string | null; status: string; stages: { label: string; done: boolean }[] } | null
  lifecycle: { label: string; state: 'done' | 'current' | 'todo' }[]
}

const PAYMENT_LABELS: Record<string, string> = {
  upfront: 'الدفعة الأولى', materials: 'دفعة المواد', installation: 'دفعة التركيب', final: 'الدفعة النهائية', custom: 'دفعة',
}

// ── Public read by token — no auth, service client, minimal client-facing data ──
export async function getPublicProject(token: string): Promise<PublicProjectView | null> {
  if (!token) return null
  const service = createServiceClient()

  const projectResult = (await service
    .from('projects').select('*').eq('public_token', token).single()) as QueryResult<Project>
  const project = projectResult.data
  if (!project) return null

  const paymentsResult = (await service
    .from('payments').select('*').eq('project_id', project.id)) as unknown as { data: Payment[] | null }
  const payments = (paymentsResult.data ?? []).filter((p) => p.status !== 'cancelled')

  const matResult = (await service
    .from('materials').select('*').eq('project_id', project.id).order('requested_at', { ascending: false }).limit(1)) as unknown as { data: Material[] | null }
  const material = matResult.data?.[0] ?? null

  const instResult = (await service
    .from('installations').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(1)) as unknown as { data: Installation[] | null }
  const installation = instResult.data?.[0] ?? null

  // Collection
  const total = project.total_amount && project.total_amount > 0
    ? project.total_amount
    : payments.reduce((s, p) => s + (p.amount ?? 0), 0)
  const paid = payments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0

  // Installation stages (only required ones for the client view)
  let installationView: PublicProjectView['installation'] = null
  if (project.has_installation && installation) {
    const stages = installation.stages ?? {}
    installationView = {
      scheduled_date: installation.scheduled_date,
      status: installation.status,
      stages: INSTALL_STAGES.filter((s) => !s.optional).map((s) => ({
        label: s.label,
        done: !!stages[s.key]?.done,
      })),
    }
  }

  // Simple lifecycle for the client
  const hasUpfront = payments.some((p) => p.type === 'upfront' && p.status === 'paid')
  const matReady = material?.status === 'ready' || material?.status === 'delivered'
  const matDelivered = material?.status === 'delivered'
  const installDone = installation?.status === 'completed'
  const isCompleted = project.status === 'completed'

  type Step = { label: string; state: 'done' | 'current' | 'todo' }
  const steps: Step[] = []
  const push = (label: string, done: boolean) => steps.push({ label, state: done ? 'done' : 'todo' })
  push('التعاقد', true)
  push('الدفعة الأولى', hasUpfront)
  push('تجهيز المواد', matReady)
  push('توريد المواد', matDelivered)
  if (project.has_installation) push('التركيب', installDone)
  push('اكتمال المشروع', isCompleted)
  // Mark the first non-done as current
  const firstTodo = steps.findIndex((s) => s.state === 'todo')
  if (firstTodo !== -1) steps[firstTodo].state = 'current'

  return {
    project_name: project.project_name,
    client_name: project.client_name,
    location: project.location,
    status: project.status,
    has_installation: project.has_installation,
    start_date: project.start_date,
    expected_end_date: project.expected_end_date,
    collection: { total, paid, pct },
    payments: payments
      .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
      .map((p) => ({ label: p.name || PAYMENT_LABELS[p.type] || 'دفعة', status: p.status })),
    materials_status: material?.status ?? null,
    installation: installationView,
    lifecycle: steps,
  }
}
