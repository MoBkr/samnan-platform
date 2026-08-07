// ─── Platform configuration ───
// Single home for values that were previously hardcoded across many files.
// Changing a business rule should mean editing one line here, not hunting
// through components.

/** Canonical public URL. Used for password-reset links so they can't be
 *  poisoned via request headers. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''

/** Supabase Storage bucket that holds every uploaded document. */
export const STORAGE_BUCKET = 'documents'

/** Per-file upload ceiling — matches Supabase Storage's default cap. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '50'

/** Minimum password length enforced on every path that sets one. */
export const MIN_PASSWORD_LENGTH = 8

/** Saudi timezone — every "today" and every displayed date resolves here. */
export const SA_TIMEZONE = 'Asia/Riyadh'

/** Folders a client may target when requesting a signed upload URL.
 *  Anything else is rejected, so callers can't write outside their area. */
export const UPLOAD_FOLDERS = [
  'contract', 'invoice', 'receipt', 'delivery_note', 'completion_photo',
  'materials_request', 'other', 'purchase', 'custody', 'installation',
  'avatars', 'client-docs', 'misc',
] as const

/** `custody/<projectId>` style prefixes are allowed for these folders. */
const SCOPED_FOLDERS = new Set(['custody', 'installation', 'purchase'])

export function isAllowedUploadFolder(folder: string): boolean {
  if (!folder || folder.includes('..') || folder.includes('\\')) return false
  const [head, ...rest] = folder.split('/')
  if (!(UPLOAD_FOLDERS as readonly string[]).includes(head)) return false
  if (rest.length === 0) return true
  // Scoped folders may carry exactly one id segment, e.g. custody/<uuid>
  return SCOPED_FOLDERS.has(head) && rest.length === 1 && /^[\w-]{1,64}$/.test(rest[0])
}

/** Materials workflow → completion percentage. Single source of truth;
 *  previously duplicated in five files with the same magic numbers. */
export const MATERIALS_STAGE_PCT: Record<string, number> = {
  delivered: 100, ready: 60, partial: 50, preparing: 30, pending: 10,
}

export function materialsPercent(status: string | null | undefined): number {
  if (!status) return 0
  return MATERIALS_STAGE_PCT[status] ?? 0
}

/** Collection percentage against the project's contract value.
 *  The dashboard used to divide by the sum of payment rows instead, so the
 *  same project showed two different numbers on two screens. */
export function collectionPercent(totalPaid: number, projectValue: number): number {
  if (!projectValue || projectValue <= 0) return 0
  return Math.round((totalPaid / projectValue) * 100)
}
