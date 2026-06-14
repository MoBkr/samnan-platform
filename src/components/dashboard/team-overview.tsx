import { cn } from '@/lib/utils'
import type { Profile, Project } from '@/types/database'

const ROLE_AVATAR: Record<string, string> = {
  coordinator: 'bg-blue-500',
  sales_engineer: 'bg-emerald-500',
  installation: 'bg-purple-500',
}

const GROUPS: { role: string; label: string; key: keyof Project; accent: string }[] = [
  { role: 'coordinator', label: 'الكوردنيتر', key: 'coordinator_id', accent: 'text-blue-600' },
  { role: 'sales_engineer', label: 'مهندسو المبيعات', key: 'sales_engineer_id', accent: 'text-emerald-600' },
  { role: 'installation', label: 'فريق التركيبات', key: 'installation_id', accent: 'text-purple-600' },
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('')
}

function loadBadge(count: number) {
  if (count === 0) return 'bg-gray-100 text-gray-500'
  if (count <= 2) return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  if (count <= 4) return 'bg-amber-50 text-amber-700 border border-amber-100'
  return 'bg-red-50 text-red-700 border border-red-100'
}

interface TeamOverviewProps {
  users: Profile[]
  projects: Project[]
}

export function TeamOverview({ users, projects }: TeamOverviewProps) {
  const activeProjects = projects.filter((p) => p.status === 'active')

  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {GROUPS.map(({ role, label, key, accent }) => {
        const members = users.filter((u) => u.role === role)
        return (
          <div key={role} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <h4 className={cn('text-sm font-bold', accent)}>{label}</h4>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">{members.length}</span>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">لا يوجد أعضاء</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const count = activeProjects.filter((p) => (p[key] as string | null) === m.id).length
                  return (
                    <li key={m.id} className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-2.5">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0', ROLE_AVATAR[role])}>
                        {initials(m.full_name)}
                      </div>
                      <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">{m.full_name}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap', loadBadge(count))}>
                        {count} نشط
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
