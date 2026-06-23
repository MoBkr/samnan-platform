import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getProjects } from '@/lib/actions/projects'
import { getCurrentProfile } from '@/lib/actions/auth'
import { INSTALL_STAGES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { ProjectsList, type ProjectProgress } from '@/components/projects/projects-list'
import type { QueryResultMany } from '@/lib/supabase/typed'

const MAT_PCT: Record<string, number> = { delivered: 100, ready: 60, partial: 50, preparing: 30, pending: 10 }
const REQ_STAGE_KEYS = INSTALL_STAGES.filter((s) => !s.optional).map((s) => s.key)

export default async function ProjectsPage() {
  const [projects, profile] = await Promise.all([getProjects(), getCurrentProfile()])
  if (!profile) return null

  // ── Per-project completion percentages (collection / materials / installation) ──
  const service = createServiceClient()
  const [paysRes, matsRes, instRes] = await Promise.all([
    service.from('payments').select('project_id, amount, paid_amount, status'),
    service.from('materials').select('project_id, status, items, requested_at').order('requested_at', { ascending: false }),
    service.from('installations').select('project_id, stages, created_at').order('created_at', { ascending: false }),
  ]) as unknown as [
    { data: { project_id: string; amount: number; paid_amount: number; status: string }[] | null },
    { data: { project_id: string; status: string; items: { status?: string }[] }[] | null },
    { data: { project_id: string; stages: Record<string, { done?: boolean }> | null }[] | null },
  ]

  const payAgg = new Map<string, { paid: number; amount: number }>()
  for (const p of paysRes.data ?? []) {
    if (p.status === 'cancelled') continue
    const a = payAgg.get(p.project_id) ?? { paid: 0, amount: 0 }
    a.paid += p.paid_amount ?? 0; a.amount += p.amount ?? 0
    payAgg.set(p.project_id, a)
  }
  const matByProj = new Map<string, { status: string; items: { status?: string }[] }>()
  for (const m of matsRes.data ?? []) if (!matByProj.has(m.project_id)) matByProj.set(m.project_id, m)
  const instByProj = new Map<string, Record<string, { done?: boolean }>>()
  for (const i of instRes.data ?? []) if (!instByProj.has(i.project_id)) instByProj.set(i.project_id, i.stages ?? {})

  const round = (n: number) => Math.round(n)
  const progress: Record<string, ProjectProgress> = {}
  for (const proj of projects) {
    const agg = payAgg.get(proj.id)
    const total = proj.total_amount && proj.total_amount > 0 ? proj.total_amount : (agg?.amount ?? 0)
    const collection = total > 0 ? round(((agg?.paid ?? 0) / total) * 100) : 0

    const m = matByProj.get(proj.id)
    const items = m?.items ?? []
    const materials = items.length > 0
      ? round((items.filter((it) => it.status === 'مكتمل').length / items.length) * 100)
      : m ? (MAT_PCT[m.status] ?? 0) : 0

    let installation: number | null = null
    if (proj.has_installation) {
      const stages = instByProj.get(proj.id) ?? {}
      installation = REQ_STAGE_KEYS.length
        ? round((REQ_STAGE_KEYS.filter((k) => stages[k]?.done).length / REQ_STAGE_KEYS.length) * 100)
        : 0
    }
    const parts = [collection, materials, ...(installation !== null ? [installation] : [])]
    const overall = round(parts.reduce((a, b) => a + b, 0) / parts.length)
    progress[proj.id] = { overall, collection, materials, installation }
  }

  // Sales engineers are view-only; coordinators (operational managers) and admin create projects
  const canCreate = ['coordinator', 'admin'].includes(profile.role)

  // Compute which projects belong to the current user
  const myProjectIds = new Set<string>()

  if (profile.role === 'coordinator') {
    for (const p of projects) {
      if ((p as { coordinator_id?: string }).coordinator_id === profile.id || p.coordinator?.id === profile.id) {
        myProjectIds.add(p.id)
      }
    }
  } else if (profile.role === 'sales_engineer') {
    for (const p of projects) {
      if ((p as { sales_engineer_id?: string }).sales_engineer_id === profile.id || p.sales_engineer?.id === profile.id) {
        myProjectIds.add(p.id)
      }
    }
  } else if (profile.role === 'installation') {
    // "my projects" = projects that have active installations
    const supabase = await createClient()
    const result = (await supabase
      .from('installations')
      .select('project_id')
      .not('status', 'eq', 'completed')) as QueryResultMany<{ project_id: string }>
    for (const i of result.data ?? []) myProjectIds.add(i.project_id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المشاريع"
        description={`${projects.length} مشروع`}
        action={
          canCreate ? (
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                مشروع جديد
              </Button>
            </Link>
          ) : undefined
        }
      />
      <ProjectsList
        projects={projects}
        myProjectIds={myProjectIds}
        currentProfile={profile}
        canCreate={canCreate}
        progress={progress}
      />
    </div>
  )
}
