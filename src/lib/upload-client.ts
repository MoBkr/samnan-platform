// Client-side direct upload to Supabase Storage.
// The file goes: Browser → Supabase (signed URL), never through Vercel.
// This bypasses Vercel's 4.5 MB serverless body limit entirely.
//
// This file's checks exist only to fail fast with a friendly message. The
// authoritative validation (extension ↔ MIME agreement, folder allowlist,
// stored content type) lives server-side in lib/actions/upload.ts.

import { createUploadSignedUrl } from '@/lib/actions/upload'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/config'

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'xlsx', 'xls', 'csv', 'dwg', 'dxf']

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export async function uploadFileDirect(
  file: File,
  folder: string,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `حجم الملف (${(file.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد المسموح به (${MAX_UPLOAD_LABEL} MB)` }
  }
  if (!ALLOWED_EXTS.includes(extOf(file.name))) {
    return { error: 'صيغة الملف غير مدعومة. يُسمح بـ PDF، صور JPG / PNG / WebP، Excel، أو أوتوكاد DWG / DXF' }
  }

  // 1. Ask the server for a signed upload URL (no file data sent — tiny request)
  const signed = await createUploadSignedUrl(file.name, folder, file.type, file.size)
  if ('error' in signed) return signed

  // 2. Upload the file directly from the browser to Supabase Storage.
  //    The content type is the one the SERVER resolved from the extension —
  //    never the browser-declared type, which a caller can set to anything.
  try {
    const res = await fetch(signed.signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': signed.contentType },
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
