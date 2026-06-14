import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProjects } from '@/lib/actions/projects'
import { getCurrentProfile } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { ProjectsList } from '@/components/projects/projects-list'
import type { QueryResultMany } from '@/lib/supabase/typed'

export default async function ProjectsPage() {
  const [projects, profile] = await Promise.all([getProjects(), getCurrentProfile()])
  if (!profile) return null

  // Sales engineers are view-only; coordinators (operational managers) and admin create projects
  const canCreate = ['coordinator', 'admin'].includes(profile.role)

  // Compute which projects belong to the current user
  const myProjectIds = new Set<string>()

  if (profile.role === 'coordinator') {
    for (const p of projects) {
      if ((p as { coordinator_id?: string }).coordinator_id === profile.id || p.coordinator?.id === profile.id) {
        myProjectIds.add(p.id)
      }
    }
  } else if (profile.role === 'sales_engineer') {
    for (const p of projects) {
      if ((p as { sales_engineer_id?: string }).sales_engineer_id === profile.id || p.sales_engineer?.id === profile.id) {
        myProjectIds.add(p.id)
      }
    }
  } else if (profile.role === 'installation') {
    // "my projects" = projects that have active installations
    const supabase = await createClient()
    const result = (await supabase
      .from('installations')
      .select('project_id')
      .not('status', 'eq', 'completed')) as QueryResultMany<{ project_id: string }>
    for (const i of result.data ?? []) myProjectIds.add(i.project_id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المشاريع"
        description={`${projects.length} مشروع`}
        action={
          canCreate ? (
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                مشروع جديد
              </Button>
            </Link>
          ) : undefined
        }
      />
      <ProjectsList
        projects={projects}
        myProjectIds={myProjectIds}
        currentProfile={profile}
        canCreate={canCreate}
      />
    </div>
  )
}
