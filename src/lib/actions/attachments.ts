'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { detachFromJsonb, removeDocumentRows, removeStorageFiles } from '@/lib/file-cleanup'
import type { Document } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB — matches the client-side limit

export async function getProjectAttachments(projectId: string) {
  try {
    const supabase = await createClient()
    const result = (await supabase
      .from('documents')
      .select('*, uploader:profiles!uploaded_by(id,full_name,role)')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })) as QueryResultMany<Document>
    return result.data ?? []
  } catch {
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

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

export async function uploadAttachment(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const file = formData.get('file') as File
    const projectId = formData.get('project_id') as string
    const docType = formData.get('type') as string

    if (!file) return { error: 'لم يتم اختيار ملف' }
    if (!projectId || !docType) return { error: 'بيانات المشروع مفقودة' }
    if (file.size > MAX_FILE_SIZE) return { error: 'حجم الملف يتجاوز 50 ميجابايت' }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedMimes.includes(file.type)) {
      return { error: 'صيغة الملف غير مدعومة. يُسمح فقط بـ JPG / PNG / WebP / PDF' }
    }

    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).slice(2)
    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${timestamp}-${randomStr}.${ext}`
    const filePath = `${docType}/${fileName}`

    const service = createServiceClient()
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const { error: uploadError } = await service.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
        return { error: 'خطأ في الإعدادات: يجب إنشاء Storage bucket باسم "documents" في Supabase' }
      }
      return { error: 'فشل رفع الملف. حاول مرة أخرى' }
    }

    const { data: urlData } = service.storage.from('documents').getPublicUrl(filePath)

    const customDescription = formData.get('description') as string | null
    const { data, error } = (await service
      .from('documents')
      .insert({
        project_id: projectId,
        type: docType,
        url: urlData?.publicUrl || '',
        uploaded_by: user.id,
        description: customDescription || file.name,
      } as never)
      .select()
      .single()) as unknown as { data: Document | null; error: Error | null }

    if (error) return { error: 'فشل حفظ بيانات الملف في قاعدة البيانات' }

    revalidatePath(`/projects/${projectId}`)
    return { success: true, data }
  } catch (e) {
    console.error('[uploadAttachment]', e)
    return { error: 'حدث خطأ غير متوقع أثناء رفع الملف' }
  }
}

export async function deleteAttachment(documentId: string, projectId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const docResult = (await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const publicUrl = formData.get('url') as string
    const projectId = formData.get('project_id') as string
    if (!publicUrl || !projectId) return { error: 'بيانات مفقودة' }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const service = createServiceClient()
    const cur = (await service
      .from('payments').select('receipt_url').eq('id', paymentId).single()) as QueryResult<{ receipt_url: string | null }>

    const { error } = (await service
      .from('payments')
      .update({ receipt_url: null } as never)
      .eq('id', paymentId)) as unknown as { error: Error | null }

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
