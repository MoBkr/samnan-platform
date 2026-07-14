import { createServiceClient } from '@/lib/supabase/service'
import type { InstallationStages, CustodyEntry } from '@/types/database'

type Service = ReturnType<typeof createServiceClient>

/**
 * A single uploaded file can be referenced from up to three places:
 *   1. the `documents` table (the project's Attachments tab)
 *   2. a jsonb column (installation stages, custody entry, purchase request)
 *   3. Supabase Storage itself
 *
 * Deleting it from any one of those must clean up the other two, otherwise the
 * UI keeps showing dead links or the storage bucket fills with orphans. Every
 * delete path goes through the helpers below.
 */

/** Public URL (.../object/public/documents/<path>) → storage path. */
export function storagePathFromUrl(url: string): string | null {
  const marker = '/documents/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  const path = url.slice(i + marker.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

/** Delete the actual file from the bucket. Never throws. */
export async function removeStorageFiles(service: Service, urls: string[]) {
  const paths = urls.map(storagePathFromUrl).filter((p): p is string => !!p)
  if (!paths.length) return
  try {
    await service.storage.from('documents').remove(paths)
  } catch (e) {
    console.error('[removeStorageFiles]', e)
  }
}

/** Remove the file's rows from the Attachments tab. */
export async function removeDocumentRows(service: Service, projectId: string | null, urls: string[]) {
  if (!projectId || !urls.length) return
  try {
    await service.from('documents').delete().eq('project_id', projectId).in('url', urls)
  } catch (e) {
    console.error('[removeDocumentRows]', e)
  }
}

/** Strip the file out of every jsonb place that can still point at it. */
export async function detachFromJsonb(service: Service, projectId: string | null, urls: string[]) {
  if (!projectId || !urls.length) return
  const gone = new Set(urls)

  try {
    // Custody entries
    const custody = (await service
      .from('custody_entries').select('id, attachments').eq('project_id', projectId)) as unknown as {
        data: Pick<CustodyEntry, 'id' | 'attachments'>[] | null
      }
    for (const e of custody.data ?? []) {
      const files = e.attachments ?? []
      if (!files.some((f) => gone.has(f.url))) continue
      await service.from('custody_entries')
        .update({ attachments: files.filter((f) => !gone.has(f.url)) } as never).eq('id', e.id)
    }
  } catch (e) {
    console.error('[detachFromJsonb:custody]', e)
  }

  try {
    // Installation stages: stage files, stage rejection evidence, per-item rejection evidence
    const installs = (await service
      .from('installations').select('id, stages').eq('project_id', projectId)) as unknown as {
        data: { id: string; stages: InstallationStages | null }[] | null
      }
    for (const inst of installs.data ?? []) {
      const stages = inst.stages ?? {}
      let touched = false
      for (const stage of Object.values(stages)) {
        if (stage.files?.some((f) => gone.has(f.url))) {
          stage.files = stage.files.filter((f) => !gone.has(f.url)); touched = true
        }
        if (stage.rejection_files?.some((f) => gone.has(f.url))) {
          stage.rejection_files = stage.rejection_files.filter((f) => !gone.has(f.url)); touched = true
        }
        for (const st of Object.values(stage.slotStates ?? {})) {
          if (st.rejection_files?.some((f) => gone.has(f.url))) {
            st.rejection_files = st.rejection_files.filter((f) => !gone.has(f.url)); touched = true
          }
        }
      }
      if (touched) await service.from('installations').update({ stages } as never).eq('id', inst.id)
    }
  } catch (e) {
    console.error('[detachFromJsonb:installations]', e)
  }

  try {
    // Purchase requests linked to this project (matched by url — cheap and exact)
    const brs = (await service
      .from('purchase_requests').select('id, attachments')) as unknown as {
        data: { id: string; attachments: { url: string; name: string }[] | null }[] | null
      }
    for (const br of brs.data ?? []) {
      const files = br.attachments ?? []
      if (!files.some((f) => gone.has(f.url))) continue
      await service.from('purchase_requests')
        .update({ attachments: files.filter((f) => !gone.has(f.url)) } as never).eq('id', br.id)
    }
  } catch (e) {
    console.error('[detachFromJsonb:purchase_requests]', e)
  }
}

/**
 * Full cleanup for files the user deleted from a feature UI (a stage, a custody
 * entry, a purchase request): drop the document rows and the stored files.
 * The caller already removed the jsonb reference itself.
 */
export async function purgeFiles(service: Service, projectId: string | null, urls: string[]) {
  if (!urls.length) return
  await removeDocumentRows(service, projectId, urls)
  await removeStorageFiles(service, urls)
}
