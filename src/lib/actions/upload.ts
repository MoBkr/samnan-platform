'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'documents'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

// ── New: returns a signed URL so the browser uploads directly to Supabase ──
// The file never passes through Vercel, so no 4.5 MB limit applies.
export async function createUploadSignedUrl(
  fileName: string,
  folder: string,
  mimeType: string,
  fileSize: number,
): Promise<{ signedUrl: string; path: string; publicUrl: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    if (fileSize > MAX_SIZE) return { error: 'حجم الملف يتجاوز 10 ميجابايت' }
    if (!ALLOWED_MIMES.includes(mimeType)) {
      return { error: 'صيغة الملف غير مدعومة. يُسمح فقط بـ JPG / PNG / WebP / PDF' }
    }

    const ext = fileName.split('.').pop() ?? 'bin'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const service = createServiceClient()
    const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path)
    if (error) return { error: 'فشل إنشاء رابط الرفع. تأكد من وجود الـ bucket في Supabase' }

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(path)
    return { signedUrl: data.signedUrl, path, publicUrl: urlData.publicUrl }
  } catch (e) {
    console.error('[createUploadSignedUrl]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}

// ── Legacy: kept for any remaining direct server-side use ──
export async function uploadFile(formData: FormData): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'misc'

    if (!file || file.size === 0) return { error: 'لم يتم اختيار ملف' }
    if (file.size > MAX_SIZE) return { error: 'حجم الملف يتجاوز 10 ميجابايت' }
    if (!ALLOWED_MIMES.includes(file.type)) {
      return { error: 'صيغة الملف غير مدعومة. يُسمح فقط بـ JPG / PNG / PDF' }
    }

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const service = createServiceClient()
    const { data, error } = await service.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) return { error: 'فشل رفع الملف. حاول مرة أخرى' }

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(data.path)
    return { url: urlData.publicUrl }
  } catch (e) {
    console.error('[uploadFile]', e)
    return { error: 'حدث خطأ غير متوقع أثناء رفع الملف' }
  }
}
