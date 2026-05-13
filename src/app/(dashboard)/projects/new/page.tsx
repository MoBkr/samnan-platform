import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/actions/auth'
import { PageHeader } from '@/components/shared/page-header'
import { NewProjectForm } from '@/components/projects/new-project-form'
import type { QueryResultMany } from '@/lib/supabase/typed'
import type { Profile } from '@/types/database'

export default async function NewProjectPage() {
  const profile = await getCurrentProfile()

  if (!profile || (profile.role !== 'coordinator' && profile.role !== 'sales_engineer' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const coordinatorsResult = (await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'coordinator')
    .eq('is_active', true)) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>

  const salesResult = (await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'sales_engineer')
    .eq('is_active', true)) as QueryResultMany<Pick<Profile, 'id' | 'full_name' | 'role'>>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="مشروع جديد"
        description="أدخل تفاصيل المشروع الجديد"
      />
      <NewProjectForm
        coordinators={coordinatorsResult.data ?? []}
        salesEngineers={salesResult.data ?? []}
        currentProfile={profile}
      />
    </div>
  )
}
