'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, User, Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { PaymentsTab } from '@/components/payments/payments-tab'
import { MaterialsTab } from '@/components/supply/materials-tab'
import { InstallationTab } from '@/components/installation/installation-tab'
import { ActivityTab } from '@/components/projects/activity-tab'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Payment, Material, SupplyOrder, Installation, ActivityLog, Profile } from '@/types/database'

type Tab = 'payments' | 'materials' | 'installation' | 'activity'

interface ProjectDetailProps {
  project: Project
  payments: Payment[]
  materials: Material[]
  supplyOrders: SupplyOrder[]
  installations: Installation[]
  activityLog: ActivityLog[]
  currentProfile: Profile
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'payments', label: 'الدفعات' },
  { id: 'materials', label: 'المواد والتوريد' },
  { id: 'installation', label: 'التركيب' },
  { id: 'activity', label: 'سجل النشاط' },
]

function getLifecycleStage(
  payments: Payment[],
  materials: Material[],
  supplyOrders: SupplyOrder[],
  installations: Installation[]
): { stage: number; label: string } {
  const hasUpfrontPaid = payments.some(p => p.type === 'upfront' && p.status === 'paid')
  const hasSupplyPaid = payments.some(p => p.type === 'supply' && p.status === 'paid')
  const hasInstallationPaid = payments.some(p => p.type === 'installation' && p.status === 'paid')
  const hasFinalPaid = payments.some(p => p.type === 'final' && p.status === 'paid')
  const hasMaterials = materials.length > 0
  const supplyDone = supplyOrders.some(o => o.status === 'completed')
  const installDone = installations.some(i => i.status === 'completed')

  if (hasFinalPaid && installDone) return { stage: 8, label: 'مكتمل' }
  if (installDone) return { stage: 7, label: 'التركيب منجز' }
  if (hasInstallationPaid) return { stage: 6, label: 'دفعة التركيب محصّلة' }
  if (supplyDone) return { stage: 5, label: 'التوريد مكتمل' }
  if (hasSupplyPaid) return { stage: 4, label: 'دفعة التوريد محصّلة' }
  if (hasMaterials) return { stage: 3, label: 'طلب المواد مُرسل' }
  if (hasUpfrontPaid) return { stage: 2, label: 'الدفعة الأولى محصّلة' }
  return { stage: 1, label: 'تم التعاقد' }
}

const LIFECYCLE_STEPS = [
  'التعاقد',
  'الدفعة الأولى',
  'طلب المواد',
  'دفعة التوريد',
  'التوريد',
  'دفعة التركيب',
  'التركيب',
  'الإغلاق',
]

export function ProjectDetail({
  project,
  payments,
  materials,
  supplyOrders,
  installations,
  activityLog,
  currentProfile,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('payments')

  const totalPaid = payments.reduce((sum, p) => sum + (p.paid_amount ?? 0), 0)
  const totalDue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const collectionPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  const { stage, label: stageLabel } = getLifecycleStage(payments, materials, supplyOrders, installations)

  return (
    <div className="space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" />
            المشاريع
          </Button>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600 font-medium">{project.project_name}</span>
      </div>

      {/* Project Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-gray-400" />
                {project.client_name}
              </span>
              {project.coordinator && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-gray-400" />
                  {project.coordinator.full_name}
                </span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDateShort(project.start_date)}
                  {project.expected_end_date && ` — ${formatDateShort(project.expected_end_date)}`}
                </span>
              )}
              {project.total_amount && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  {formatCurrency(project.total_amount)}
                </span>
              )}
              {project.contract_url && (
                <a
                  href={project.contract_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  العقد
                </a>
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div className="flex gap-3 shrink-0">
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-center min-w-[100px]">
              <p className="text-xs text-blue-600 font-medium">المحصّل</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-blue-500 mt-0.5">{collectionPct}%</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center min-w-[100px]">
              <p className="text-xs text-gray-500 font-medium">الإجمالي</p>
              <p className="text-lg font-bold text-gray-700 mt-0.5">{formatCurrency(totalDue)}</p>
              <p className="text-xs text-gray-400 mt-0.5">المتفق عليه</p>
            </div>
          </div>
        </div>

        {/* Collection progress bar */}
        {totalDue > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                نسبة التحصيل
              </span>
              <span className="font-semibold text-gray-700">{collectionPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${collectionPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${collectionPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lifecycle Progress */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">مرحلة المشروع</h3>
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 rounded-full px-3 py-1">
            {stageLabel}
          </span>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const stepNum = idx + 1
            const isDone = stepNum < stage
            const isCurrent = stepNum === stage
            return (
              <div key={step} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    )}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium whitespace-nowrap',
                    isDone ? 'text-emerald-600' : isCurrent ? 'text-brand-600' : 'text-gray-400'
                  )}>
                    {step}
                  </span>
                </div>
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div className={cn(
                    'h-0.5 w-8 mx-1 mb-4',
                    stepNum < stage ? 'bg-emerald-400' : 'bg-gray-200'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-all border-b-2',
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'payments' && (
          <PaymentsTab payments={payments} projectId={project.id} currentProfile={currentProfile} />
        )}
        {activeTab === 'materials' && (
          <MaterialsTab
            materials={materials}
            supplyOrders={supplyOrders}
            projectId={project.id}
            currentProfile={currentProfile}
            payments={payments}
          />
        )}
        {activeTab === 'installation' && (
          <InstallationTab
            installations={installations}
            projectId={project.id}
            currentProfile={currentProfile}
            payments={payments}
          />
        )}
        {activeTab === 'activity' && <ActivityTab activityLog={activityLog} />}
      </div>
    </div>
  )
}
