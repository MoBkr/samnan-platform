import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'
import type { PaymentLite, MaterialLite } from './progress-overview'

export interface InstallFull { project_id: string; status: string; installation_team_confirmed: boolean }

interface ProjectTasksProps {
  projects: Project[] // active, scoped
  payments: PaymentLite[]
  materials: MaterialLite[]
  installations: InstallFull[]
  overdueProjectIds: Set<string>
}

interface Task { stage: string; tone: string; action: string; urgent?: boolean }

const TONE: Record<string, string> = {
  red: 'bg-red-50 text-red-700 border-red-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

export function ProjectTasks({ projects, payments, materials, installations, overdueProjectIds }: ProjectTasksProps) {
  // Build per-project lookups
  const paidProjects = new Set(payments.filter((p) => (p.paid_amount ?? 0) > 0).map((p) => p.project_id))

  const materialStatus = new Map<string, string>()
  const rank = (s: string) => ['pending', 'preparing', 'ready', 'delivered'].indexOf(s)
  materials.forEach((m) => {
    const cur = materialStatus.get(m.project_id)
    if (!cur || rank(m.status) > rank(cur)) materialStatus.set(m.project_id, m.status)
  })

  const installsBy = new Map<string, InstallFull[]>()
  installations.forEach((i) => {
    const arr = installsBy.get(i.project_id) ?? []
    arr.push(i)
    installsBy.set(i.project_id, arr)
  })

  function taskFor(p: Project): Task {
    if (overdueProjectIds.has(p.id)) return { stage: 'تحصيل', tone: 'red', action: 'تحصيل دفعة متأخرة', urgent: true }

    const insts = installsBy.get(p.id) ?? []
    if (insts.some((i) => i.status === 'completed')) return { stage: 'الإغلاق', tone: 'indigo', action: 'تحصيل الدفعة النهائية وإغلاق المشروع' }
    if (insts.length > 0) {
      if (insts.some((i) => !i.installation_team_confirmed)) return { stage: 'التركيب', tone: 'purple', action: 'تأكيد موعد التركيب' }
      return { stage: 'التركيب', tone: 'purple', action: 'متابعة إتمام التركيب' }
    }

    const mat = materialStatus.get(p.id)
    if (mat === 'delivered' || mat === 'ready') return { stage: 'التركيب', tone: 'purple', action: 'جدولة التركيب' }
    if (mat === 'pending' || mat === 'preparing') return { stage: 'المواد', tone: 'amber', action: 'تجهيز وتسليم المواد' }

    if (paidProjects.has(p.id)) return { stage: 'المواد', tone: 'amber', action: 'طلب المواد للمشروع' }
    return { stage: 'الدفعات', tone: 'blue', action: 'تحصيل الدفعة الأولى' }
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <p className="text-sm font-medium text-gray-700">لا توجد مشاريع نشطة</p>
        <p className="text-xs text-gray-400 mt-1">ستظهر هنا المهام المطلوبة لكل مشروع</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-50">
      {projects.slice(0, 8).map((p) => {
        const t = taskFor(p)
        return (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{p.project_name}</p>
                <p className="truncate text-xs text-gray-500 mt-0.5">{p.client_name}</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-bold', TONE[t.tone])}>
                  {t.stage}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 w-40 justify-end">
                {t.urgent && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                <span className={cn('text-xs font-medium text-end', t.urgent ? 'text-red-600' : 'text-gray-600')}>{t.action}</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
