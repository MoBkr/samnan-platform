'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import type { Document } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function getProjectAttachments(projectId: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('documents')
    .select('*, uploader:profiles!uploaded_by(id,full_name,role)')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false })) as QueryResultMany<Document>
  return result.data ?? []
}

export async function uploadAttachment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const file = formData.get('file') as File
  const projectId = formData.get('project_id') as string
  const docType = formData.get('type') as string

  if (!file) return { error: 'لم يتم اختيار ملف' }
  if (!projectId || !docType) return { error: 'بيانات المشروع مفقودة' }
  if (file.size > MAX_FILE_SIZE) return { error: 'حجم الملف يتجاوز 10 ميجابايت' }

  // Check file type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedMimes.includes(file.type)) {
    return { error: 'صيغة الملف غير مدعومة. يُسمح فقط بـ JPG / PNG / WebP / PDF' }
  }

  // Upload file to Supabase Storage
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).slice(2)
  const ext = file.name.split('.').pop() || 'bin'
  const fileName = `${timestamp}-${randomStr}.${ext}`
  const filePath = `${docType}/${fileName}`

  const service = createServiceClient()
  const { error: uploadError } = await service.storage
    .from('documents')
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    return { error: 'فشل رفع الملف. تأكد من إنشاء الـ bucket في Supabase' }
  }

  // Get public URL
  const { data: urlData } = service.storage
    .from('documents')
    .getPublicUrl(filePath)

  // Create document record
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

  if (error) return { error: 'فشل حفظ بيانات الملف' }

  revalidatePath(`/projects/${projectId}`)
  return { success: true, data }
}

export async function deleteAttachment(documentId: string, projectId: string) {
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
  const urlParts = docResult.data.url.split('/').pop()
  if (urlParts) {
    const filePath = `${docResult.data.type}/${urlParts}`
    await service.storage.from('documents').remove([filePath])
  }

  const { error } = (await service
    .from('documents')
    .delete()
    .eq('id', documentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل حذف الملف' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'حذف مرفق',
    details: { document_id: documentId, type: docResult.data.type, description: docResult.data.description },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteContractUrl(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('projects')
    .update({ contract_url: null } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل حذف العقد' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'حذف العقد الأساسي',
    details: {},
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function uploadContractUrl(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const file = formData.get('file') as File
  const projectId = formData.get('project_id') as string

  if (!file) return { error: 'لم يتم اختيار ملف' }
  if (file.size > MAX_FILE_SIZE) return { error: 'حجم الملف يتجاوز 10 ميجابايت' }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedMimes.includes(file.type)) return { error: 'صيغة الملف غير مدعومة' }

  const timestamp = Date.now()
  const ext = file.name.split('.').pop() || 'bin'
  const fileName = `contract-${timestamp}.${ext}`
  const filePath = `contracts/${fileName}`

  const service = createServiceClient()
  const { error: uploadError } = await service.storage
    .from('documents')
    .upload(filePath, file, { upsert: false })

  if (uploadError) return { error: 'فشل رفع الملف' }

  const { data: urlData } = service.storage.from('documents').getPublicUrl(filePath)
  const publicUrl = urlData?.publicUrl || ''

  const { error } = (await service
    .from('projects')
    .update({ contract_url: publicUrl } as never)
    .eq('id', projectId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تحديث رابط العقد' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'رفع عقد جديد',
    details: { file_name: file.name },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true, url: publicUrl }
}

export async function deletePaymentReceipt(paymentId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()
  const { error } = (await service
    .from('payments')
    .update({ receipt_url: null } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل حذف الإيصال' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'حذف إيصال دفعة',
    details: { payment_id: paymentId },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
