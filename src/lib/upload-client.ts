// Client-side direct upload to Supabase Storage.
// The file goes: Browser → Supabase (signed URL), never through Vercel.
// This bypasses Vercel's 4.5 MB serverless body limit entirely.

import { createUploadSignedUrl } from '@/lib/actions/upload'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function uploadFileDirect(
  file: File,
  folder: string,
): Promise<{ url: string } | { error: string }> {
  // Client-side validation first — gives instant feedback before any network call
  if (file.size > MAX_SIZE) {
    return { error: `حجم الملف (${(file.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد المسموح به (10 MB)` }
  }
  if (!ALLOWED_MIMES.includes(file.type)) {
    return { error: 'صيغة الملف غير مدعومة. يُسمح فقط بـ PDF أو صورة JPG / PNG / WebP' }
  }

  // 1. Ask the server for a signed upload URL (no file data sent — tiny request)
  const signed = await createUploadSignedUrl(file.name, folder, file.type, file.size)
  if ('error' in signed) return signed

  // 2. Upload the file directly from the browser to Supabase Storage
  try {
    const res = await fetch(signed.signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[uploadFileDirect] Supabase error:', res.status, text)
      return { error: `فشل رفع الملف (${res.status}). حاول مرة أخرى` }
    }
  } catch (e) {
    console.error('[uploadFileDirect] network error:', e)
    return { error: 'فشل رفع الملف. تحقق من الاتصال بالإنترنت' }
  }

  // 3. Return the public URL
  return { url: signed.publicUrl }
}
