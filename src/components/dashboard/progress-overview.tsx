import { Wallet, Package, Hammer, Gauge } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Project } from '@/types/database'

export interface PaymentLite { project_id: string; amount: number; paid_amount: number; status: string }
export interface MaterialLite { project_id: string; status: string }
export interface InstallationLite { project_id: string; status: string }

interface ProgressOverviewProps {
  projects: Project[]
  payments: PaymentLite[]
  materials: MaterialLite[]
  installations: InstallationLite[]
}

export function ProgressOverview({ projects, payments, materials, installations }: ProgressOverviewProps) {
  const ids = new Set(projects.map((p) => p.id))
  const total = projects.length

  // Collection (money %)
  const scopedPayments = payments.filter((p) => ids.has(p.project_id))
  const collected = scopedPayments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  const totalValue = projects.reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const collectionPct = totalValue > 0 ? Math.round((collected / totalValue) * 100) : 0

  // Materials delivered (project milestone %)
  const deliveredProjects = new Set(
    materials.filter((m) => ids.has(m.project_id) && m.status === 'delivered').map((m) => m.project_id)
  )
  const materialsPct = total > 0 ? Math.round((deliveredProjects.size / total) * 100) : 0

  // Installations completed (project milestone %)
  const completedInstallProjects = new Set(
    installations.filter((i) => ids.has(i.project_id) && i.status === 'completed').map((i) => i.project_id)
  )
  const installPct = total > 0 ? Math.round((completedInstallProjects.size / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
          <Gauge className="h-4 w-4 text-indigo-700" />
        </div>
        <h3 className="font-bold text-gray-900">نسب الإنجاز</h3>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <ProgressRing
          icon={<Wallet className="h-4 w-4" />}
          label="التحصيل المالي"
          pct={collectionPct}
          color="text-emerald-600"
          ring="stroke-emerald-500"
          caption={`${formatCurrency(collected)} / ${formatCurrency(totalValue)}`}
        />
        <ProgressRing
          icon={<Package className="h-4 w-4" />}
          label="المواد المسلّمة"
          pct={materialsPct}
          color="text-amber-600"
          ring="stroke-amber-500"
          caption={`${deliveredProjects.size} من ${total} مشروع`}
        />
        <ProgressRing
          icon={<Hammer className="h-4 w-4" />}
          label="التركيبات المكتملة"
          pct={installPct}
          color="text-purple-600"
          ring="stroke-purple-500"
          caption={`${completedInstallProjects.size} من ${total} مشروع`}
        />
      </div>
    </div>
  )
}

function ProgressRing({ icon, label, pct, color, ring, caption }: {
  icon: React.ReactNode
  label: string
  pct: number
  color: string
  ring: string
  caption: string
}) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} className="stroke-gray-100" strokeWidth="7" fill="none" />
          <circle
            cx="36" cy="36" r={radius}
            className={ring}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{caption}</p>
    </div>
  )
}
