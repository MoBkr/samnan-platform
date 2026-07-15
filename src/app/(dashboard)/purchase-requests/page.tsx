import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getPurchaseRequests } from '@/lib/actions/purchase-requests'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { PurchaseBoard } from '@/components/purchase/purchase-board'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export default async function PurchaseRequestsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'coordinator' && profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [requests, usersRes, projectsRes, myProjectsRes] = await Promise.all([
    getPurchaseRequests(),
    supabase.from('profiles').select('id, full_name, role').eq('is_active', true) as unknown as Promise<QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>>,
    supabase.from('projects').select('project_name').order('created_at', { ascending: false }) as unknown as Promise<QueryResultMany<{ project_name: string }>>,
    // Projects this user is responsible for → drives the "مشاريعي" filter
    supabase.from('projects')
      .select('project_name')
      .or(`coordinator_id.eq.${profile.id},sales_engineer_id.eq.${profile.id},installation_id.eq.${profile.id}`) as unknown as Promise<QueryResultMany<{ project_name: string }>>,
  ])

  const projectNames = Array.from(new Set((projectsRes.data ?? []).map((p) => p.project_name).filter(Boolean)))
  const myProjectNames = Array.from(new Set((myProjectsRes.data ?? []).map((p) => p.project_name).filter(Boolean)))

  return (
    <div className="space-y-6">
      <PageHeader title="طلبات المشتريات (BR)" description="متابعة طلبات الشراء عبر مراحلها حتى الاستلام" />
      <PurchaseBoard
        requests={requests}
        users={usersRes.data ?? []}
        projectNames={projectNames}
        myProjectNames={myProjectNames}
        currentProfile={profile}
      />
    </div>
  )
}
