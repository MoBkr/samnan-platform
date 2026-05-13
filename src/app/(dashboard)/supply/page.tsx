import { getAllPendingMaterials } from '@/lib/actions/materials'
import { getCurrentProfile } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { SupplyDashboard } from '@/components/dashboard/supply-dashboard'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { SupplyOrder } from '@/types/database'
import { redirect } from 'next/navigation'

export default async function SupplyPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  if (!['supply', 'coordinator', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const pendingMaterials = await getAllPendingMaterials()

  const ordersResult = (await supabase
    .from('supply_orders')
    .select('*, project:projects(id, client_name, project_name)')
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_date', { ascending: true })) as QueryResultMany<SupplyOrder & { project: { id: string; client_name: string; project_name: string } }>

  return (
    <SupplyDashboard
      profile={profile}
      pendingMaterials={pendingMaterials}
      upcomingOrders={ordersResult.data ?? []}
    />
  )
}
