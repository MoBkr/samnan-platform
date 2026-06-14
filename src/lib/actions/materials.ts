'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Material, MaterialItem } from '@/types/database'

export async function getProjectMaterials(projectId: string): Promise<Material | null> {
  const supabase = await createClient()
  const result = (await supabase
    .from('materials')
    .select('*')
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false })
    .limit(1)) as unknown as { data: Material[] | null }
  return result.data?.[0] ?? null
}

export async function updateMaterialsItems(projectId: string, items: MaterialItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const existing = await getProjectMaterials(projectId)

  if (existing) {
    const { error } = (await service
      .from('materials')
      .update({ items } as never)
      .eq('id', existing.id)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل حفظ قائمة المواد' }
  } else {
    const { error } = (await service
      .from('materials')
      .insert({
        project_id: projectId,
        requested_by: user.id,
        status: 'pending',
        items,
      } as never)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل إنشاء سجل المواد' }
  }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'تحديث قائمة المواد',
    details: { count: items.length },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateMaterialsStatus(
  projectId: string,
  status: 'pending' | 'ready' | 'delivered'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const existing = await getProjectMaterials(projectId)

  if (existing) {
    const updateData: Record<string, unknown> = { status }
    if (status === 'ready') updateData.ready_at = new Date().toISOString()
    const { error } = (await service
      .from('materials')
      .update(updateData as never)
      .eq('id', existing.id)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل تحديث حالة المواد' }
  } else {
    const { error } = (await service
      .from('materials')
      .insert({
        project_id: projectId,
        requested_by: user.id,
        status,
        items: [],
      } as never)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل إنشاء سجل المواد' }
  }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: `تحديث حالة المواد — ${status}`,
    details: { status },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
