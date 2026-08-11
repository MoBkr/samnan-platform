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

/**
 * Validates the storage folder a client asks to upload into.
 *
 * This checks the SHAPE of the path, not a list of names. Folder names in this
 * app come from document types, client-doc fields and per-project scopes
 * (`custody/<id>`, `materials/<id>`, …) — an exact-name allowlist silently
 * broke real uploads whenever a caller used a name the list hadn't anticipated.
 *
 * Shape rules are what actually carry the security weight: the stored file name
 * is a server-generated UUID, so the folder cannot be used to overwrite an
 * existing object, and the only real risk is escaping the bucket — which is
 * exactly what these rules prevent.
 */
const FOLDER_SEGMENT = /^[A-Za-z0-9_-]{1,64}$/

export function isAllowedUploadFolder(folder: string): boolean {
  if (!folder || folder.length > 130) return false
  if (folder.includes('\\') || folder.includes('..')) return false
  const segments = folder.split('/')
  // At most `<area>/<id>` — nothing deeper, nothing absolute, no empty parts.
  if (segments.length < 1 || segments.length > 2) return false
  return segments.every((s) => FOLDER_SEGMENT.test(s))
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
