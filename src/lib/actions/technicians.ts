'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { formatDateShort } from '@/lib/utils'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import type { Technician, TechnicianAssignment, TechnicianWithStatus } from '@/types/database'

// Technicians are managed by installation managers + coordinator/admin.
async function requireTechManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' as const }
  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  const role = profileResult.data?.role
  if (role !== 'installation' && role !== 'coordinator' && role !== 'admin') {
    return { error: 'متاح لمدير التركيبات والكوردنيتر فقط' as const }
  }
  return { user }
}

// ── Pool with availability (current active assignment per technician) ──
export async function getTechnicians(): Promise<TechnicianWithStatus[]> {
  const service = createServiceClient()
  const techResult = (await service
    .from('technicians').select('*').order('name', { ascending: true })) as QueryResultMany<Technician>
  const technicians = techResult.data ?? []

  const assignResult = (await service
    .from('technician_assignments')
    .select('*, project:projects(id, project_name, client_name)')
    .eq('status', 'active')) as QueryResultMany<TechnicianAssignment & { project?: { id: string; project_name: string; client_name: string } }>
  const active = assignResult.data ?? []

  return technicians.map((t) => ({
    ...t,
    current: active.find((a) => a.technician_id === t.id) ?? null,
  }))
}

export async function getProjectTechnicians(projectId: string) {
  const service = createServiceClient()
  const result = (await service
    .from('technician_assignments')
    .select('*, technician:technicians(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })) as QueryResultMany<TechnicianAssignment & { technician?: Technician }>
  return result.data ?? []
}

export async function getTechnicianHistory(technicianId: string) {
  const service = createServiceClient()
  const result = (await service
    .from('technician_assignments')
    .select('*, project:projects(id, project_name, client_name)')
    .eq('technician_id', technicianId)
    .order('start_date', { ascending: false })) as QueryResultMany<TechnicianAssignment & { project?: { id: string; project_name: string; client_name: string } }>
  return result.data ?? []
}

export async function addTechnician(data: { name: string; employee_no?: string; phone?: string }) {
  const auth = await requireTechManager()
  if ('error' in auth) return { error: auth.error }
  if (!data.name?.trim()) return { error: 'يرجى إدخال اسم الفني' }
  const service = createServiceClient()
  const { error } = (await service.from('technicians').insert({
    name: data.name.trim(),
    employee_no: data.employee_no?.trim() || null,
    phone: data.phone?.trim() || null,
  } as never)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل إضافة الفني' }
  revalidatePath('/technicians')
  return { success: true }
}

export async function updateTechnician(id: string, data: { name: string; employee_no?: string; phone?: string; is_active?: boolean }) {
  const auth = await requireTechManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name.trim()
  if (data.employee_no !== undefined) patch.employee_no = data.employee_no?.trim() || null
  if (data.phone !== undefined) patch.phone = data.phone?.trim() || null
  if (data.is_active !== undefined) patch.is_active = data.is_active
  const { error } = (await service
    .from('technicians').update(patch as never).eq('id', id)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تحديث الفني' }
  revalidatePath('/technicians')
  return { success: true }
}

// ── Assign a technician to a project for a date range (with booking conflict check) ──
export async function assignTechnician(data: {
  technicianId: string
  projectId: string
  startDate: string
  endDate: string
}) {
  const auth = await requireTechManager()
  if ('error' in auth) return { error: auth.error }
  const { technicianId, projectId, startDate, endDate } = data
  if (!technicianId || !startDate || !endDate) return { error: 'يرجى تحديد الفني وفترة الحجز' }
  if (endDate < startDate) return { error: 'تاريخ النهاية قبل تاريخ البداية' }

  const service = createServiceClient()

  // Conflict check: any active assignment whose range overlaps [startDate, endDate]
  const existingResult = (await service
    .from('technician_assignments')
    .select('*, project:projects(project_name)')
    .eq('technician_id', technicianId)
    .eq('status', 'active')) as QueryResultMany<TechnicianAssignment & { project?: { project_name: string } }>
  const conflict = (existingResult.data ?? []).find(
    (a) => a.start_date <= endDate && a.end_date >= startDate
  )
  if (conflict) {
    return {
      error: `الفني محجوز بالفعل من ${formatDateShort(conflict.start_date)} إلى ${formatDateShort(conflict.end_date)}${conflict.project?.project_name ? ` على مشروع «${conflict.project.project_name}»` : ''}. غيّره أو أزله أولاً.`,
    }
  }

  const { error } = (await service.from('technician_assignments').insert({
    technician_id: technicianId,
    project_id: projectId,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
    created_by: auth.user.id,
  } as never)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تعيين الفني' }

  const techResult = (await service
    .from('technicians').select('name').eq('id', technicianId).single()) as QueryResult<{ name: string }>
  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `تعيين فني: ${techResult.data?.name ?? ''} (${formatDateShort(startDate)} — ${formatDateShort(endDate)})`,
    details: { technician_id: technicianId, start_date: startDate, end_date: endDate },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/technicians')
  return { success: true }
}

async function endAssignment(assignmentId: string, status: 'done' | 'removed') {
  const auth = await requireTechManager()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const cur = (await service
    .from('technician_assignments').select('project_id, technician_id').eq('id', assignmentId).single()) as QueryResult<{ project_id: string; technician_id: string }>
  const { error } = (await service
    .from('technician_assignments')
    .update({ status, ended_at: new Date().toISOString() } as never)
    .eq('id', assignmentId)) as unknown as { error: Error | null }
  if (error) return { error: 'فشل تحديث التعيين' }
  if (cur.data) {
    await service.from('activity_log').insert({
      project_id: cur.data.project_id, user_id: auth.user.id,
      action: status === 'done' ? 'إنهاء تعيين فني (اكتمل)' : 'إزالة فني من المشروع',
      details: { assignment_id: assignmentId, technician_id: cur.data.technician_id },
    } as never)
    revalidatePath(`/projects/${cur.data.project_id}`)
  }
  revalidatePath('/technicians')
  return { success: true }
}

export async function removeAssignment(assignmentId: string) {
  return endAssignment(assignmentId, 'removed')
}

export async function completeAssignment(assignmentId: string) {
  return endAssignment(assignmentId, 'done')
}
