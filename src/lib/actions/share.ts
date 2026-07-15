'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { INSTALL_STAGES, DOCUMENT_TYPE_LABELS } from '@/lib/constants'
import type { QueryResult } from '@/lib/supabase/typed'
import type { Project, Payment, Installation, Material, Document } from '@/types/database'

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
      .from('projects').update({ public_token: token } as never).eq('id', projectId)) as unknown as { error: { message?: string } | null }
    if (error) {
      console.error('[getOrCreateShareToken] update failed:', error)
      const detail = error.message?.includes('public_token')
        ? 'عمود public_token غير موجود — يرجى تشغيل الـSQL (بند 0b) في Supabase'
        : (error.message ?? 'خطأ غير معروف')
      return { error: `فشل إنشاء الرابط: ${detail}` }
    }
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
  materialsPct: number
  installPct: number | null
  payments: { label: string; label_en: string; status: string }[]
  materials_status: string | null
  materials: { total: number; done: number; pct: number; allDone: boolean; items: { description: string; status: string }[] } | null
  installation: { scheduled_date: string | null; expected_end_date: string | null; status: string; stages: { label: string; label_en: string; done: boolean }[] } | null
  lifecycle: { label: string; label_en: string; state: 'done' | 'current' | 'todo' }[]
  attachments: { name: string; url: string }[]
}

const PAYMENT_LABELS: Record<string, string> = {
  upfront: 'الدفعة الأولى', materials: 'دفعة المواد', installation: 'دفعة التركيب', final: 'الدفعة النهائية', custom: 'دفعة',
}
const PAYMENT_LABELS_EN: Record<string, string> = {
  upfront: 'Upfront Payment', materials: 'Materials Payment', installation: 'Installation Payment', final: 'Final Payment', custom: 'Payment',
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

  const docsResult = (await service
    .from('documents').select('type, url, description, uploaded_at').eq('project_id', project.id).order('uploaded_at', { ascending: false })) as unknown as {
      data: Pick<Document, 'type' | 'url' | 'description' | 'uploaded_at'>[] | null
    }
  const attachments = (docsResult.data ?? []).map((d) => ({
    name: d.description || DOCUMENT_TYPE_LABELS[d.type] || 'مستند',
    url: d.url,
  }))
  if (project.contract_url) attachments.unshift({ name: 'العقد', url: project.contract_url })

  // Collection
  const total = project.total_amount && project.total_amount > 0
    ? project.total_amount
    : payments.reduce((s, p) => s + (p.amount ?? 0), 0)
  const paid = payments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0

  // Installation stages (only required ones for the client view)
  const reqStages = INSTALL_STAGES.filter((s) => !s.optional)
  let installPct: number | null = null
  let installationView: PublicProjectView['installation'] = null
  if (project.has_installation && installation) {
    const stages = installation.stages ?? {}
    const doneStages = reqStages.filter((s) => stages[s.key]?.done).length
    installPct = reqStages.length > 0 ? Math.round((doneStages / reqStages.length) * 100) : 0
    installationView = {
      scheduled_date: installation.scheduled_date,
      expected_end_date: installation.expected_end_date ?? null,
      status: installation.status,
      stages: INSTALL_STAGES.filter((s) => !s.optional).map((s) => ({
        label: s.label,
        label_en: s.en ?? s.label,
        done: !!stages[s.key]?.done,
      })),
    }
  }

  // Materials status detail for the client (item list + completion)
  const MAT_PCT: Record<string, number> = { delivered: 100, ready: 60, partial: 50, preparing: 30, pending: 10 }
  let materialsView: PublicProjectView['materials'] = null
  const matItems = material?.items ?? []
  let materialsPct = material ? (MAT_PCT[material.status] ?? 0) : 0
  if (matItems.length > 0) {
    const done = matItems.filter((it) => (it.status || '').trim() === 'مكتمل').length
    materialsPct = Math.round((done / matItems.length) * 100)
    materialsView = {
      total: matItems.length,
      done,
      pct: Math.round((done / matItems.length) * 100),
      allDone: done === matItems.length,
      items: matItems.map((it) => ({
        description: it.description || it.name || '—',
        status: (it.status || '').trim() || 'لم يطلب',
      })),
    }
  }

  // Simple lifecycle for the client
  const hasUpfront = payments.some((p) => p.type === 'upfront' && p.status === 'paid')
  const matReady = material?.status === 'ready' || material?.status === 'delivered'
  const matDelivered = material?.status === 'delivered'
  const installDone = installation?.status === 'completed'
  const isCompleted = project.status === 'completed'

  type Step = { label: string; label_en: string; state: 'done' | 'current' | 'todo' }
  const steps: Step[] = []
  const push = (label: string, label_en: string, done: boolean) => steps.push({ label, label_en, state: done ? 'done' : 'todo' })
  push('التعاقد', 'Contract', true)
  push('الدفعة الأولى', 'Upfront Payment', hasUpfront)
  push('تجهيز المواد', 'Materials Preparation', matReady)
  push('توريد المواد', 'Materials Delivery', matDelivered)
  if (project.has_installation) push('التركيب', 'Installation', installDone)
  push('اكتمال المشروع', 'Project Completion', isCompleted)
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
    materialsPct,
    installPct,
    payments: payments
      .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
      .map((p) => ({
        label: p.name || PAYMENT_LABELS[p.type] || 'دفعة',
        label_en: p.name || PAYMENT_LABELS_EN[p.type] || 'Payment',
        status: p.status,
      })),
    materials_status: material?.status ?? null,
    materials: materialsView,
    installation: installationView,
    lifecycle: steps,
    attachments,
  }
}
