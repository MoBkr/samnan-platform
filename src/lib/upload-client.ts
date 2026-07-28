// Client-side direct upload to Supabase Storage.
// The file goes: Browser → Supabase (signed URL), never through Vercel.
// This bypasses Vercel's 4.5 MB serverless body limit entirely.

import { createUploadSignedUrl } from '@/lib/actions/upload'

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB — Supabase Storage's default per-file cap
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls / some .csv
  'text/csv',
  // AutoCAD — browsers report these inconsistently, extension check below is the real gate
  'application/acad', 'application/x-dwg', 'image/vnd.dwg', 'application/dxf', 'image/vnd.dxf',
]
// Browsers often give AutoCAD files an empty/octet-stream MIME type, so the
// file extension is the reliable check.
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'xlsx', 'xls', 'csv', 'dwg', 'dxf']

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export async function uploadFileDirect(
  file: File,
  folder: string,
): Promise<{ url: string } | { error: string }> {
  // Client-side validation first — gives instant feedback before any network call
  if (file.size > MAX_SIZE) {
    return { error: `حجم الملف (${(file.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد المسموح به (50 MB)` }
  }
  if (!ALLOWED_MIMES.includes(file.type) && !ALLOWED_EXTS.includes(extOf(file.name))) {
    return { error: 'صيغة الملف غير مدعومة. يُسمح بـ PDF، صور JPG / PNG / WebP، Excel، أو أوتوكاد DWG / DXF' }
  }

  // 1. Ask the server for a signed upload URL (no file data sent — tiny request)
  const signed = await createUploadSignedUrl(file.name, folder, file.type, file.size)
  if ('error' in signed) return signed

  // 2. Upload the file directly from the browser to Supabase Storage
  try {
    const res = await fetch(signed.signedUrl, {
      method: 'PUT',
      body: file,
      // CAD files often have an empty type — storage needs something valid
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
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
