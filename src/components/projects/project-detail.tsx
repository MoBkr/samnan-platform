'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, User, Calendar, DollarSign, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  { id: 'payments', label: 'المدفوعات' },
  { id: 'materials', label: 'المواد والتوريد' },
  { id: 'installation', label: 'التركيب' },
  { id: 'activity', label: 'سجل النشاط' },
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

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            المشاريع
          </Button>
        </Link>
      </div>

      {/* Project Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {project.client_name}
                </span>
                {project.coordinator && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {project.coordinator.full_name}
                  </span>
                )}
                {project.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDateShort(project.start_date)}
                  </span>
                )}
                {project.total_amount && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
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

            {/* Quick stats */}
            <div className="flex gap-4 text-center">
              <div className="rounded-lg bg-blue-50 px-4 py-2">
                <p className="text-xs text-blue-600">المحصّل</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-2">
                <p className="text-xs text-gray-500">إجمالي الدفعات</p>
                <p className="text-lg font-bold text-gray-700">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
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
          <PaymentsTab
            payments={payments}
            projectId={project.id}
            currentProfile={currentProfile}
          />
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
        {activeTab === 'activity' && (
          <ActivityTab activityLog={activityLog} />
        )}
      </div>
    </div>
  )
}
