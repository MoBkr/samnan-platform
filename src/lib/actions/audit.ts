'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { QueryResult } from '@/lib/supabase/typed'

export interface AuditEntry {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user: { full_name: string; role: string } | null
  project: { id: string; project_name: string } | null
}

export interface AuditBr { id: string; project_name: string | null; br_number: string | null }

export async function getAuditLog(): Promise<{ logs: AuditEntry[]; brs: AuditBr[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { logs: [], brs: [] }
  const prof = (await supabase.from('profiles').select('role').eq('id', user.id).single()) as QueryResult<{ role: string }>
  if (prof.data?.role !== 'coordinator' && prof.data?.role !== 'admin') return { logs: [], brs: [] }

  const service = createServiceClient()
  const logsRes = (await service
    .from('activity_log')
    .select('id, action, details, created_at, user:profiles!user_id(full_name, role), project:projects!project_id(id, project_name)')
    .order('created_at', { ascending: false })
    .limit(1500)) as unknown as { data: AuditEntry[] | null }

  const brRes = (await service
    .from('purchase_requests')
    .select('id, project_name, br_number')) as unknown as { data: AuditBr[] | null }

  return { logs: logsRes.data ?? [], brs: brRes.data ?? [] }
}
