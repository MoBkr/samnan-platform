'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'documents'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function uploadFile(formData: FormData): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) || 'misc'

  if (!file || file.size === 0) return { error: 'لم يتم اختيار ملف' }
  if (file.size > MAX_SIZE) return { error: 'حجم الملف يتجاوز 10 ميجابايت' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    return { error: 'صيغة الملف غير مدعومة. يُسمح فقط بـ JPG / PNG / PDF' }
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    if (error.message.includes('The resource already exists')) {
      return { error: 'اسم الملف موجود مسبقاً، حاول مرة أخرى' }
    }
    return { error: 'فشل رفع الملف. تأكد من إنشاء الـ bucket في Supabase' }
  }

  const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(data.path)
  return { url: urlData.publicUrl }
}
