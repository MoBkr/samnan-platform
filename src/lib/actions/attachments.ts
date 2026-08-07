'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { detachFromJsonb, removeDocumentRows, removeStorageFiles } from '@/lib/file-cleanup'
import type { Document } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'
import { requireProjectAccess, requireManager } from '@/lib/auth/guards'
import { STORAGE_BUCKET } from '@/lib/config'

// Document URLs arrive from the client and are later rendered as links — to
// staff and, via the share page, to the customer. Anything not inside our own
// storage bucket is rejected so a caller can't plant an external link.
function isOurStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base || !url) return false
  return url.startsWith(`${base}/storage/v1/object/public/${STORAGE_BUCKET}/`)
}

export async function getProjectAttachments(projectId: string) {
  const guard = await requireProjectAccess(projectId)
  if ('error' in guard) return []
  try {
    const supabase = await createClient()
    const result = (await supabase
      .from('documents')
      .select('*, uploader:profiles!uploaded_by(id,full_name,role)')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })) as QueryResultMany<Document>
    // A query failure is not "no attachments" — surface it in the logs rather
    // than silently rendering an empty state over a broken database.
    if (result.error) console.error('[getProjectAttachments]', result.error)
    return result.data ?? []
  } catch (e) {
    console.error('[getProjectAttachments]', e)
    return []
  }
}

// Called after the client uploads the file directly to Supabase Storage.
// Only saves the document record — no file data passes through Vercel.
export async function saveDocumentRecord(
  projectId: string,
  docType: string,
  publicUrl: string,
  description: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const guard = await requireProjectAccess(projectId)
    if ('error' in guard) return { error: guard.error }
    if (!isOurStorageUrl(publicUrl)) return { error: 'رابط الملف غير صالح' }
    const user = { id: guard.ctx.userId }

    const service = createServiceClient()
    const { error } = (await service
      .from('documents')
      .insert({
        project_id: projectId,
        type: docType,
        url: publicUrl,
        uploaded_by: user.id,
        description,
      } as never)) as unknown as { error: Error | null }

    if (error) return { error: 'فشل حفظ بيانات الملف' }

    await service.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'رفع مستند',
      details: { type: docType, description },
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[saveDocumentRecord]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

// Save a document linked to a specific payment (after client-side upload)
export async function savePaymentAttachment(
  projectId: string,
  paymentId: string,
  docType: string,
  publicUrl: string,
  description: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const guard = await requireProjectAccess(projectId)
    if ('error' in guard) return { error: guard.error }
    if (!isOurStorageUrl(publicUrl)) return { error: 'رابط الملف غير صالح' }
    const user = { id: guard.ctx.userId }

    const service = createServiceClient()
    const { error } = (await service
      .from('documents')
      .insert({
        project_id: projectId,
        payment_id: paymentId,
        type: docType,
        url: publicUrl,
        uploaded_by: user.id,
        description,
      } as never)) as unknown as { error: Error | null }

    if (error) return { error: 'فشل حفظ المرفق' }

    await service.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'إضافة مرفق لدفعة',
      details: { payment_id: paymentId, type: docType, description },
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[savePaymentAttachment]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

export async function deleteAttachment(documentId: string, projectId: string) {
  try {
    const guard = await requireProjectAccess(projectId, { write: true })
    if ('error' in guard) return { error: guard.error }
    const user = { id: guard.ctx.userId }

    const supabase = await createClient()
    // Scope the lookup to the project the caller was authorized for — without
    // this, any document id could be deleted by passing a project you can access.
    const docResult = (await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('project_id', projectId)
      .single()) as QueryResult<Document>

    if (!docResult.data) return { error: 'الملف غير موجود' }

    const service = createServiceClient()
    const url = docResult.data.url

    const { error } = (await service
      .from('documents')
      .delete()
      .eq('id', documentId)) as unknown as { error: Error | null }

    if (error) return { error: 'فشل حذف الملف' }

    // The same file may still be referenced by an installation stage, a custody
    // entry or a purchase request — clear those, then drop the stored file.
    await detachFromJsonb(service, projectId, [url])
    await removeStorageFiles(service, [url])

    await service.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'حذف مرفق',
      details: { document_id: documentId, type: docResult.data.type, description: docResult.data.description },
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[deleteAttachment]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

export async function deleteContractUrl(projectId: string) {
  try {
    const guard = await requireManager()
    if ('error' in guard) return { error: guard.error }
    const user = { id: guard.ctx.userId }

    const service = createServiceClient()
    const cur = (await service
      .from('projects').select('contract_url').eq('id', projectId).single()) as QueryResult<{ contract_url: string | null }>

    const { error } = (await service
      .from('projects')
      .update({ contract_url: null } as never)
      .eq('id', projectId)) as unknown as { error: Error | null }

    if (error) return { error: 'فشل حذف العقد' }

    if (cur.data?.contract_url) {
      await removeDocumentRows(service, projectId, [cur.data.contract_url])
      await removeStorageFiles(service, [cur.data.contract_url])
    }

    await service.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'حذف العقد الأساسي',
      details: {},
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[deleteContractUrl]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

// Receives the public URL (file already uploaded by client directly to Supabase).
export async function uploadContractUrl(formData: FormData) {
  try {
    const guard = await requireManager()
    if ('error' in guard) return { error: guard.error }
    const user = { id: guard.ctx.userId }

    const publicUrl = formData.get('url') as string
    const projectId = formData.get('project_id') as string
    if (!publicUrl || !projectId) return { error: 'بيانات مفقودة' }
    if (!isOurStorageUrl(publicUrl)) return { error: 'رابط الملف غير صالح' }

    const service = createServiceClient()
    const { error } = (await service
      .from('projects')
      .update({ contract_url: publicUrl } as never)
      .eq('id', projectId)) as unknown as { error: Error | null }

    if (error) return { error: 'فشل تحديث رابط العقد' }

    await service.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'رفع عقد جديد',
      details: {},
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true, url: publicUrl }
  } catch (e) {
    console.error('[uploadContractUrl]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

// Client document slots stored directly on the project (single-use, view-only)
const CLIENT_DOC_FIELDS = ['cr_url', 'vat_url', 'national_address_url'] as const
type ClientDocField = typeof CLIENT_DOC_FIELDS[number]
const CLIENT_DOC_LABELS: Record<ClientDocField, string> = {
  cr_url: 'السجل التجاري',
  vat_url: 'شهادة القيمة المضافة',
  national_address_url: 'العنوان الوطني',
}

export async function setClientDoc(projectId: string, field: ClientDocField, url: string) {
  if (!CLIENT_DOC_FIELDS.includes(field)) return { error: 'حقل غير صالح' }
  try {
    const guard = await requireManager()
    if ('error' in guard) return { error: guard.error }
    if (!isOurStorageUrl(url)) return { error: 'رابط الملف غير صالح' }
    const user = { id: guard.ctx.userId }

    const service = createServiceClient()
    const { error } = (await service
      .from('projects').update({ [field]: url } as never).eq('id', projectId)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل حفظ المستند' }

    await service.from('activity_log').insert({
      project_id: projectId, user_id: user.id,
      action: `رفع ${CLIENT_DOC_LABELS[field]}`, details: {},
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[setClientDoc]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

export async function clearClientDoc(projectId: string, field: ClientDocField) {
  if (!CLIENT_DOC_FIELDS.includes(field)) return { error: 'حقل غير صالح' }
  try {
    const guard = await requireManager()
    if ('error' in guard) return { error: guard.error }
    const user = { id: guard.ctx.userId }

    const service = createServiceClient()
    const cur = (await service
      .from('projects').select(field).eq('id', projectId).single()) as QueryResult<Record<string, string | null>>
    const oldUrl = cur.data?.[field] ?? null

    const { error } = (await service
      .from('projects').update({ [field]: null } as never).eq('id', projectId)) as unknown as { error: Error | null }
    if (error) return { error: 'فشل حذف المستند' }

    if (oldUrl) {
      await removeDocumentRows(service, projectId, [oldUrl])
      await removeStorageFiles(service, [oldUrl])
    }

    await service.from('activity_log').insert({
      project_id: projectId, user_id: user.id,
      action: `حذف ${CLIENT_DOC_LABELS[field]}`, details: {},
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[clearClientDoc]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

export async function deletePaymentReceipt(paymentId: string, projectId: string) {
  try {
    const guard = await requireManager()
    if ('error' in guard) return { error: guard.error }
    const user = { id: guard.ctx.userId }

    const service = createServiceClient()
    // Scope by project too, so a payment id from another project can't be hit.
    const cur = (await service
      .from('payments').select('receipt_url').eq('id', paymentId).eq('project_id', projectId).single()) as QueryResult<{ receipt_url: string | null }>
    if (!cur.data) return { error: 'الدفعة غير موجودة' }

    const { error } = (await service
      .from('payments')
      .update({ receipt_url: null } as never)
      .eq('id', paymentId)
      .eq('project_id', projectId)) as unknown as { error: Error | null }

    if (error) return { error: 'فشل حذف الإيصال' }

    if (cur.data?.receipt_url) {
      await removeDocumentRows(service, projectId, [cur.data.receipt_url])
      await removeStorageFiles(service, [cur.data.receipt_url])
    }

    await service.from('activity_log').insert({
      project_id: projectId,
      user_id: user.id,
      action: 'حذف إيصال دفعة',
      details: { payment_id: paymentId },
    } as never)

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (e) {
    console.error('[deletePaymentReceipt]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}
