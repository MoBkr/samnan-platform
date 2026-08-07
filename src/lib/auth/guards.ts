// ─── Central authorization guards ───
//
// IMPORTANT: this file is deliberately NOT a `'use server'` module. Anything
// exported from a `'use server'` file becomes a publicly callable RPC endpoint
// whether or not the UI references it — guards must never be reachable that
// way. These are plain helpers imported by server actions.
//
// Why they matter here: every write in this app goes through the service-role
// client, which bypasses Row Level Security. The check inside the action is
// therefore the ONLY authorization control — a missing check means anyone who
// can POST a server action gets service-role effects.

import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/supabase/typed'
import type { UserRole } from '@/types/database'

export const UNAUTHORIZED = 'غير مصرح' as const

export interface AuthContext {
  userId: string
  role: UserRole
}

type GuardResult = { ctx: AuthContext } | { error: string }

/** Signed in, profile exists, and the account is still active. */
export async function requireAuth(): Promise<GuardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: UNAUTHORIZED }

  const result = (await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()) as QueryResult<{ role: UserRole; is_active: boolean }>

  // No profile row, or deactivated by an admin → treat as signed out.
  if (!result.data || result.data.is_active === false) return { error: UNAUTHORIZED }

  return { ctx: { userId: user.id, role: result.data.role } }
}

/** Signed in AND holding one of the listed roles. */
export async function requireRole(
  ...roles: UserRole[]
): Promise<GuardResult> {
  const auth = await requireAuth()
  if ('error' in auth) return auth
  if (!roles.includes(auth.ctx.role)) return { error: UNAUTHORIZED }
  return auth
}

/** Admin only — user management and other platform-wide operations. */
export async function requireAdmin(): Promise<GuardResult> {
  return requireRole('admin')
}

/**
 * Operational managers: any coordinator (PM engineer) or admin may act on any
 * project — this mirrors the business rule already encoded in the UI, where
 * coordinators are the operational owners of the whole portfolio.
 */
export async function requireManager(): Promise<GuardResult> {
  return requireRole('coordinator', 'admin')
}

/**
 * Access to ONE specific project.
 *  - admin / coordinator → every project
 *  - sales_engineer      → projects where they are the assigned sales engineer
 *  - installation        → projects where they are the assigned installer
 *
 * `write` narrows further: sales/installation may read their project but must
 * not perform manager-only writes (payments, project status, team, value…).
 */
export async function requireProjectAccess(
  projectId: string,
  opts: { write?: boolean } = {}
): Promise<GuardResult> {
  const auth = await requireAuth()
  if ('error' in auth) return auth
  const { role, userId } = auth.ctx

  if (role === 'admin' || role === 'coordinator') return auth
  if (opts.write) return { error: UNAUTHORIZED }
  if (!projectId) return { error: UNAUTHORIZED }

  const supabase = await createClient()
  const result = (await supabase
    .from('projects')
    .select('sales_engineer_id, installation_id')
    .eq('id', projectId)
    .single()) as QueryResult<{ sales_engineer_id: string | null; installation_id: string | null }>

  if (!result.data) return { error: UNAUTHORIZED }
  const assigned =
    (role === 'sales_engineer' && result.data.sales_engineer_id === userId) ||
    (role === 'installation' && result.data.installation_id === userId)

  return assigned ? auth : { error: UNAUTHORIZED }
}

/** Roles allowed to run the installation workflow on a project. */
export async function requireInstallAccess(projectId?: string): Promise<GuardResult> {
  const auth = await requireRole('installation', 'coordinator', 'admin')
  if ('error' in auth) return auth
  if (auth.ctx.role === 'installation' && projectId) {
    return requireProjectAccess(projectId)
  }
  return auth
}

/** Whitelist a client-supplied role so it can never be escalated to admin. */
export function isValidRole(value: unknown): value is UserRole {
  return value === 'coordinator' || value === 'sales_engineer'
    || value === 'installation' || value === 'admin'
}
