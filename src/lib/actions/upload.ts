'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth } from '@/lib/auth/guards'
import {
  STORAGE_BUCKET, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, isAllowedUploadFolder,
} from '@/lib/config'

// Extension → the single content type we will store it as. Deriving the type
// server-side (instead of trusting the browser's `file.type`) closes the
// stored-XSS path where a file named report.pdf is declared as text/html and
// then served as a page from our own storage origin.
const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  dwg: 'application/acad', dxf: 'application/dxf',
}

// MIME families each extension may legitimately arrive as. Validation requires
// the extension to be known AND the declared type to be consistent with it —
// previously either one passing was enough.
const EXT_ALLOWED_MIMES: Record<string, string[]> = {
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'],
  pdf: ['application/pdf'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  // Browsers routinely report CAD files with no type at all.
  dwg: ['application/acad', 'application/x-dwg', 'image/vnd.dwg', 'application/octet-stream', ''],
  dxf: ['application/dxf', 'image/vnd.dxf', 'application/octet-stream', 'text/plain', ''],
}

// Not exported: a 'use server' module may only export async functions.
const UNSUPPORTED_TYPE_MESSAGE =
  'صيغة الملف غير مدعومة. يُسمح بـ PDF، صور JPG / PNG / WebP، Excel، أو أوتوكاد DWG / DXF'

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

/** Returns the content type to store under, or null when the file is rejected. */
function resolveContentType(fileName: string, declaredMime: string): string | null {
  const ext = extensionOf(fileName)
  const allowed = EXT_ALLOWED_MIMES[ext]
  if (!allowed) return null
  const mime = (declaredMime || '').toLowerCase()
  if (mime && !allowed.includes(mime)) return null
  return EXT_CONTENT_TYPE[ext]
}

// ── Signed URL so the browser uploads directly to Supabase ──
// The file never passes through Vercel, so no 4.5 MB body limit applies.
export async function createUploadSignedUrl(
  fileName: string,
  folder: string,
  mimeType: string,
  fileSize: number,
): Promise<{ signedUrl: string; path: string; publicUrl: string; contentType: string } | { error: string }> {
  try {
    const guard = await requireAuth()
    if ('error' in guard) return { error: guard.error }

    if (fileSize > MAX_UPLOAD_BYTES) {
      return { error: `حجم الملف يتجاوز ${MAX_UPLOAD_LABEL} ميجابايت` }
    }
    // The folder decides where in the shared bucket the file lands — an
    // unchecked value let a caller write anywhere, including path traversal.
    if (!isAllowedUploadFolder(folder)) return { error: 'مسار التخزين غير مسموح' }

    const contentType = resolveContentType(fileName, mimeType)
    if (!contentType) return { error: UNSUPPORTED_TYPE_MESSAGE }

    const ext = extensionOf(fileName)
    // crypto.randomUUID() — Math.random() is not a CSPRNG, and the path is the
    // only thing standing between a document and anyone who guesses its URL.
    const path = `${folder}/${crypto.randomUUID()}.${ext}`

    const service = createServiceClient()
    const { data, error } = await service.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path)
    if (error) return { error: 'فشل إنشاء رابط الرفع. تأكد من وجود الـ bucket في Supabase' }

    const { data: urlData } = service.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return { signedUrl: data.signedUrl, path, publicUrl: urlData.publicUrl, contentType }
  } catch (e) {
    console.error('[createUploadSignedUrl]', e)
    return { error: 'حدث خطأ غير متوقع' }
  }
}
