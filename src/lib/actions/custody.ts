'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CUSTODY_CATEGORY_LABELS } from '@/lib/constants'
import { purgeFiles } from '@/lib/file-cleanup'
import { formatCurrency } from '@/lib/utils'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import type { CustodyEntry, CustodyKind } from '@/types/database'

// Custody is managed by the installation manager, the coordinator and admin.
async function requireCustodyEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' as const }
  const profileResult = (await supabase
    .from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  const role = profileResult.data?.role
  if (role !== 'installation' && role !== 'coordinator' && role !== 'admin') {
    return { error: 'متاح لمدير التركيبات ومهندس إدارة المشاريع والإدارة فقط' as const }
  }
  return { user }
}

export async function getProjectCustody(projectId: string): Promise<CustodyEntry[]> {
  // Financial records — the writes were guarded but this read was wide open.
  const guard = await requireCustodyEditor()
  if ('error' in guard) return []
  const service = createServiceClient()
  const result = (await service
    .from('custody_entries')
    .select('*, creator:profiles!created_by(id, full_name)')
    .eq('project_id', projectId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })) as QueryResultMany<CustodyEntry>
  return result.data ?? []
}

export async function addCustodyEntry(data: {
  projectId: string
  kind: CustodyKind
  category?: string | null
  description: string
  amount: number
  entryDate?: string | null
  recipient?: string | null
  invoiceNumber?: string | null
  notes?: string | null
  attachments?: { url: string; name: string }[]
}) {
  const auth = await requireCustodyEditor()
  if ('error' in auth) return { error: auth.error }
  if (!data.description?.trim()) return { error: 'يرجى إدخال البيان' }
  if (!data.amount || data.amount <= 0) return { error: 'يرجى إدخال مبلغ صحيح' }

  const service = createServiceClient()
  const attachments = data.attachments ?? []

  const { error } = (await service.from('custody_entries').insert({
    project_id: data.projectId,
    kind: data.kind,
    category: data.category || null,
    description: data.description.trim(),
    amount: data.amount,
    entry_date: data.entryDate || null,
    recipient: data.recipient?.trim() || null,
    // Sent only when filled — entries without an invoice keep saving even
    // before the invoice_number migration is applied.
    ...(data.invoiceNumber?.trim() ? { invoice_number: data.invoiceNumber.trim() } : {}),
    notes: data.notes?.trim() || null,
    attachments,
    created_by: auth.user.id,
  } as never)) as unknown as { error: { message?: string } | null }

  if (error) {
    console.error('[addCustodyEntry]', error)
    return { error: `فشل حفظ العهدة — ${error.message ?? ''}`.trim() }
  }

  // Receipts also show up in the project's Attachments tab
  for (const f of attachments) {
    await service.from('documents').insert({
      project_id: data.projectId, type: 'other', url: f.url, uploaded_by: auth.user.id,
      description: `عهدة — ${data.description.trim()}: ${f.name}`,
    } as never)
  }

  const kindLabel = data.kind === 'advance' ? 'استلام عهدة' : 'صرف من العهدة'
  await service.from('activity_log').insert({
    project_id: data.projectId, user_id: auth.user.id,
    action: `${kindLabel}: ${data.description.trim()} — ${formatCurrency(data.amount)}${data.category ? ` (${CUSTODY_CATEGORY_LABELS[data.category] ?? data.category})` : ''}${data.invoiceNumber?.trim() ? ` — فاتورة ${data.invoiceNumber.trim()}` : ''}${attachments.length ? ` — ${attachments.length} مرفق` : ''}`,
    details: {
      kind: data.kind, amount: data.amount, category: data.category ?? null,
      recipient: data.recipient ?? null, invoice_number: data.invoiceNumber ?? null,
      attachments: attachments.map((f) => f.name),
    },
  } as never)

  revalidatePath(`/projects/${data.projectId}`)
  return { success: true }
}

export async function deleteCustodyEntry(id: string, projectId: string) {
  const auth = await requireCustodyEditor()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()

  const cur = (await service
    .from('custody_entries').select('description, amount, kind, attachments').eq('id', id).single()) as QueryResult<{
      description: string; amount: number; kind: string; attachments: { url: string; name: string }[]
    }>

  const { error } = (await service
    .from('custody_entries').delete().eq('id', id)) as unknown as { error: { message?: string } | null }
  if (error) {
    console.error('[deleteCustodyEntry]', error)
    return { error: `فشل حذف السجل — ${error.message ?? ''}`.trim() }
  }

  // Remove its receipts from the project's attachments and from storage too
  const files = cur.data?.attachments ?? []
  await purgeFiles(service, projectId, files.map((f) => f.url))

  await service.from('activity_log').insert({
    project_id: projectId, user_id: auth.user.id,
    action: `حذف سجل عهدة: ${cur.data?.description ?? ''} — ${cur.data ? formatCurrency(cur.data.amount) : ''}`,
    details: { custody_id: id, attachments: files.map((f) => f.name) },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
