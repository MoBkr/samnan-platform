'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, Building2, Calendar, DollarSign, FileText, TrendingUp,
  CheckCircle2, PauseCircle, XCircle, PlayCircle, AlertTriangle, Users, Briefcase, Edit2, Trash2, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { PaymentsTab } from '@/components/payments/payments-tab'
import { InstallationTab } from '@/components/installation/installation-tab'
import { MaterialsTab } from '@/components/projects/materials-tab'
import { ActivityTab } from '@/components/projects/activity-tab'
import { AttachmentsTab } from '@/components/projects/attachments-tab'
import { updateProjectStatus, updateProjectTeam, updateProjectAmount, updateProjectInfo, deleteProject } from '@/lib/actions/projects'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Payment, Installation, ActivityLog, Profile, Document, Material } from '@/types/database'

type Tab = 'payments' | 'installation' | 'materials' | 'attachments' | 'activity'
type ActionDialog = 'complete' | 'cancel' | 'hold' | 'reactivate' | 'team' | 'editAmount' | 'editInfo' | 'delete' | null

function workloadLabel(count: number) {
  if (count === 0) return 'لا مشاريع نشطة'
  if (count === 1) return 'مشروع نشط واحد'
  return `${count} مشاريع نشطة`
}

function WorkloadChip({ count }: { count: number }) {
  const color = count === 0
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : count <= 2
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}>
      <Briefcase className="h-3 w-3" />
      {workloadLabel(count)}
    </span>
  )
}

interface ProjectDetailProps {
  project: Project
  payments: Payment[]
  installations: Installation[]
  attachments: Document[]
  material: Material | null
  activityLog: ActivityLog[]
  currentProfile: Profile
  coordinators: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  salesEngineers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  installationPersons: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  coordinatorWorkload: Record<string, number>
  salesWorkload: Record<string, number>
  installationWorkload: Record<string, number>
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'payments', label: 'الدفعات' },
  { id: 'installation', label: 'التركيب' },
  { id: 'materials', label: 'المواد' },
  { id: 'attachments', label: 'المرفقات' },
  { id: 'activity', label: 'سجل النشاط' },
]

function getLifecycleStage(
  payments: Payment[],
  installations: Installation[],
  material: Material | null,
  attachments: Document[]
): { stage: number; label: string } {
  const hasUpfrontPaid = payments.some(p => p.type === 'upfront' && p.status === 'paid')
  const hasInstallationPaid = payments.some(p => p.type === 'installation' && p.status === 'paid')
  const hasFinalPaid = payments.some(p => p.type === 'final' && p.status === 'paid')
  const hasScheduledInstall = installations.length > 0
  const installDone = installations.some(i => i.status === 'completed')

  const hasMaterialsRequest = attachments.some(a => a.type === 'materials_request')
    || (material?.items && material.items.length > 0)
  const hasDeliveryNote = attachments.some(a => a.type === 'delivery_note')

  if (installDone && (hasFinalPaid || hasInstallationPaid)) return { stage: 7, label: 'مكتمل' }
  if (installDone) return { stage: 6, label: 'التركيب منجز' }
  if (hasScheduledInstall) return { stage: 5, label: 'التركيب مجدول' }
  if (hasDeliveryNote) return { stage: 4, label: 'المواد موردة' }
  if (hasMaterialsRequest) return { stage: 3, label: 'المواد مطلوبة' }
  if (hasUpfrontPaid || hasFinalPaid) return { stage: 2, label: 'الدفعة الأولى محصّلة' }
  return { stage: 1, label: 'تم التعاقد' }
}

const LIFECYCLE_STEPS = ['التعاقد', 'الدفعات', 'طلب المواد', 'توريد المواد', 'التركيب مجدول', 'التركيب منجز', 'الإغلاق']

export function ProjectDetail({
  project,
  payments,
  installations,
  attachments,
  material,
  activityLog,
  currentProfile,
  coordinators,
  salesEngineers,
  installationPersons,
  coordinatorWorkload,
  salesWorkload,
  installationWorkload,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('payments')
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [newAmount, setNewAmount] = useState(project.total_amount?.toString() ?? '')
  const [editInfo, setEditInfo] = useState({
    project_name: project.project_name,
    client_name: project.client_name,
    location: project.location ?? '',
    total_amount: project.total_amount?.toString() ?? '',
    start_date: project.start_date ?? '',
    expected_end_date: project.expected_end_date ?? '',
  })
  const [teamCoordinatorId, setTeamCoordinatorId] = useState(project.coordinator_id ?? '')
  const [teamSalesId, setTeamSalesId] = useState(project.sales_engineer_id ?? '')
  const [teamInstallationId, setTeamInstallationId] = useState(project.installation_id ?? '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const activePayments = payments.filter(p => p.status !== 'cancelled')
  const totalPaid = activePayments.reduce((sum, p) => sum + (p.paid_amount ?? 0), 0)
  const totalDue = activePayments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const collectionPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  const isFullyPaid = project.total_amount != null && project.total_amount > 0 && totalPaid >= project.total_amount

  const { stage, label: stageLabel } = getLifecycleStage(payments, installations, material, attachments)

  // The coordinator is the operational manager: ANY coordinator (and admin)
  // can view and manage every project, not just the one they're assigned to.
  const canManage = currentProfile.role === 'admin' || currentProfile.role === 'coordinator'
  const isCoordinator = currentProfile.role === 'coordinator'
  const isActive = project.status === 'active'
  const isOnHold = project.status === 'on_hold'
  const isFinished = project.status === 'completed' || project.status === 'cancelled'
  const hasPendingPayments = payments.some(p => p.status === 'pending' || p.status === 'partial')

  function handleAction(action: ActionDialog) {
    if (action === 'cancel') setCancelReason('')
    if (action === 'editAmount') setNewAmount(project.total_amount?.toString() ?? '')
    if (action === 'editInfo') setEditInfo({
      project_name: project.project_name,
      client_name: project.client_name,
      location: project.location ?? '',
      total_amount: project.total_amount?.toString() ?? '',
      start_date: project.start_date ?? '',
      expected_end_date: project.expected_end_date ?? '',
    })
    setDialog(action)
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        let result: { error?: string } | undefined

        if (dialog === 'complete') {
          result = await updateProjectStatus(project.id, 'completed')
        } else if (dialog === 'hold') {
          result = await updateProjectStatus(project.id, 'on_hold')
        } else if (dialog === 'reactivate') {
          result = await updateProjectStatus(project.id, 'active')
        } else if (dialog === 'cancel') {
          if (!cancelReason.trim()) { toast.error('يرجى إدخال سبب الإلغاء'); return }
          result = await updateProjectStatus(project.id, 'cancelled', cancelReason.trim())
        } else if (dialog === 'team') {
          result = await updateProjectTeam(
            project.id,
            teamCoordinatorId || null,
            teamSalesId || null,
            teamInstallationId || null
          )
        } else if (dialog === 'editAmount') {
          const parsed = parseFloat(newAmount)
          if (isNaN(parsed) || parsed <= 0) { toast.error('يرجى إدخال قيمة صحيحة'); return }
          result = await updateProjectAmount(project.id, parsed)
        } else if (dialog === 'editInfo') {
          result = await updateProjectInfo(project.id, {
            project_name: editInfo.project_name,
            client_name: editInfo.client_name,
            location: editInfo.location || null,
            total_amount: editInfo.total_amount ? parseFloat(editInfo.total_amount) : null,
            start_date: editInfo.start_date || null,
            expected_end_date: editInfo.expected_end_date || null,
          })
        } else if (dialog === 'delete') {
          result = await deleteProject(project.id)
          if (!result?.error) {
            toast.success('تم حذف المشروع نهائياً')
            router.push('/projects')
            return
          }
        }

        if (result?.error) {
          toast.error(result.error)
        } else {
          const labels: Record<string, string> = {
            complete: 'تم إغلاق المشروع بنجاح',
            hold: 'تم تعليق المشروع',
            reactivate: 'تم إعادة تفعيل المشروع',
            cancel: 'تم إلغاء المشروع',
            team: 'تم تحديث الفريق',
            editAmount: 'تم تحديث قيمة المشروع',
            editInfo: 'تم تحديث معلومات المشروع',
          }
          toast.success(labels[dialog!] ?? 'تم التحديث')
          setDialog(null)
        }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className="space-y-4">
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
              {isFullyPaid && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  مدفوع بالكامل
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-gray-400" />
                {project.client_name}
              </span>
              {project.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {project.location}
                </span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDateShort(project.start_date)}
                  {project.expected_end_date && ` — ${formatDateShort(project.expected_end_date)}`}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-400" />
                {project.total_amount ? formatCurrency(project.total_amount) : <span className="text-gray-400 font-normal italic text-xs">القيمة غير محددة</span>}
                {canManage && (
                  <button
                    onClick={() => handleAction('editAmount')}
                    className="ms-1 text-gray-400 hover:text-brand-600 transition-colors"
                    title="تعديل القيمة"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
              {project.contract_url && (
                <a href={project.contract_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 hover:underline font-medium">
                  <FileText className="h-4 w-4" />
                  العقد
                </a>
              )}
            </div>

            {/* Team chips */}
            {(project.coordinator || project.sales_engineer || project.installation_person) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {project.coordinator && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs">
                    <span className="font-bold text-blue-500 shrink-0">الكوردنيتر</span>
                    <span className="h-1 w-1 rounded-full bg-blue-300 shrink-0" />
                    <span className="text-blue-800 font-medium">{project.coordinator.full_name}</span>
                  </span>
                )}
                {project.sales_engineer && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs">
                    <span className="font-bold text-emerald-600 shrink-0">المبيعات</span>
                    <span className="h-1 w-1 rounded-full bg-emerald-300 shrink-0" />
                    <span className="text-emerald-800 font-medium">{project.sales_engineer.full_name}</span>
                  </span>
                )}
                {project.installation_person && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-1 text-xs">
                    <span className="font-bold text-purple-600 shrink-0">التركيب</span>
                    <span className="h-1 w-1 rounded-full bg-purple-300 shrink-0" />
                    <span className="text-purple-800 font-medium">{project.installation_person.full_name}</span>
                  </span>
                )}
              </div>
            )}

            {/* Cancellation reason */}
            {project.status === 'cancelled' && project.cancellation_reason && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span><strong>سبب الإلغاء:</strong> {project.cancellation_reason}</span>
              </div>
            )}
          </div>

          {/* Financial summary */}
          <div className="flex gap-3 shrink-0">
            <div className={`rounded-xl px-4 py-3 text-center min-w-[100px] ${isFullyPaid ? 'bg-emerald-50' : 'bg-blue-50'}`}>
              <p className={`text-xs font-medium ${isFullyPaid ? 'text-emerald-600' : 'text-blue-600'}`}>المحصّل</p>
              <p className={`text-lg font-bold mt-0.5 ${isFullyPaid ? 'text-emerald-700' : 'text-blue-700'}`}>{formatCurrency(totalPaid)}</p>
              <p className={`text-xs mt-0.5 ${isFullyPaid ? 'text-emerald-500' : 'text-blue-500'}`}>{collectionPct}%</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center min-w-[100px]">
              <p className="text-xs text-gray-500 font-medium">الإجمالي</p>
              <p className="text-lg font-bold text-gray-700 mt-0.5">{project.total_amount ? formatCurrency(project.total_amount) : formatCurrency(totalDue)}</p>
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
                className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(collectionPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {canManage && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
            {canManage && !isFinished && (
              <Button size="sm" variant="outline" onClick={() => handleAction('editInfo')} className="gap-1.5">
                <Edit2 className="h-4 w-4" />
                تعديل المعلومات
              </Button>
            )}
            {(currentProfile.role === 'admin' || (isCoordinator && !isFinished)) && (
              <Button size="sm" variant="outline" onClick={() => handleAction('team')} className="gap-1.5">
                <Users className="h-4 w-4" />
                تعديل الفريق
              </Button>
            )}
            {!isFinished && (
              <>
                {isActive && (
                  <>
                    <Button size="sm" variant="success" onClick={() => handleAction('complete')} className="gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      إغلاق المشروع
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction('hold')}
                      className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50">
                      <PauseCircle className="h-4 w-4" />
                      تعليق المشروع
                    </Button>
                  </>
                )}
                {isOnHold && (
                  <Button size="sm" variant="outline" onClick={() => handleAction('reactivate')}
                    className="gap-1.5 text-brand-700 border-brand-200 hover:bg-brand-50">
                    <PlayCircle className="h-4 w-4" />
                    إعادة تفعيل
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => handleAction('cancel')}
                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="h-4 w-4" />
                  إلغاء المشروع
                </Button>
              </>
            )}
            {/* Delete — admin or coordinator, cancelled or on_hold only */}
            {canManage && (project.status === 'cancelled' || project.status === 'on_hold') && (
              <Button size="sm" variant="outline" onClick={() => handleAction('delete')}
                className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50 ms-auto">
                <Trash2 className="h-4 w-4" />
                حذف المشروع نهائياً
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Lifecycle Progress */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">مرحلة المشروع</h3>
          <span className="text-xs font-semibold rounded-full px-3 py-1 text-brand-600 bg-brand-50">
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
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                    isDone ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-gray-200 text-gray-400'
                  )}>
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
                  <div className={cn('h-0.5 w-8 mx-1 mb-4', stepNum < stage ? 'bg-emerald-400' : 'bg-gray-200')} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
              {tab.id === 'attachments' && attachments.length > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {attachments.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'payments' && (
          <PaymentsTab payments={payments} projectId={project.id} canManage={canManage} />
        )}
        {activeTab === 'installation' && (
          <InstallationTab installations={installations} projectId={project.id} canManage={canManage} currentProfile={currentProfile} />
        )}
        {activeTab === 'materials' && (
          <MaterialsTab material={material} attachments={attachments} projectId={project.id} canManage={canManage} payments={payments} />
        )}
        {activeTab === 'attachments' && (
          <AttachmentsTab
            attachments={attachments}
            projectId={project.id}
            project={project}
            payments={payments}
            canManage={canManage}
          />
        )}
        {activeTab === 'activity' && <ActivityTab activityLog={activityLog} />}
      </div>

      {/* ── Edit Project Info dialog ── */}
      <Dialog open={dialog === 'editInfo'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>تعديل معلومات المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_project_name">اسم المشروع *</Label>
              <Input id="edit_project_name" value={editInfo.project_name}
                onChange={e => setEditInfo(p => ({ ...p, project_name: e.target.value }))}
                placeholder="اسم المشروع" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_client_name">اسم العميل *</Label>
              <Input id="edit_client_name" value={editInfo.client_name}
                onChange={e => setEditInfo(p => ({ ...p, client_name: e.target.value }))}
                placeholder="اسم العميل" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_location">موقع المشروع</Label>
            <Input id="edit_location" value={editInfo.location}
              onChange={e => setEditInfo(p => ({ ...p, location: e.target.value }))}
              placeholder="الرياض — حي النخيل" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_total_amount">القيمة الإجمالية (ريال)</Label>
            <Input id="edit_total_amount" type="number" min="0" step="0.01"
              value={editInfo.total_amount}
              onChange={e => setEditInfo(p => ({ ...p, total_amount: e.target.value }))}
              placeholder="0.00" dir="ltr" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit_start_date">تاريخ البداية</Label>
              <Input id="edit_start_date" type="date" dir="ltr"
                value={editInfo.start_date}
                onChange={e => setEditInfo(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_end_date">تاريخ الانتهاء المتوقع</Label>
              <Input id="edit_end_date" type="date" dir="ltr"
                value={editInfo.expected_end_date}
                onChange={e => setEditInfo(p => ({ ...p, expected_end_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleConfirm}
            disabled={!editInfo.project_name.trim() || !editInfo.client_name.trim()}>
            <Edit2 className="h-4 w-4" />
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Edit Amount dialog ── */}
      <Dialog open={dialog === 'editAmount'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>تعديل قيمة المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {project.total_amount && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600">
                القيمة الحالية: <strong className="text-gray-900">{formatCurrency(project.total_amount)}</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>القيمة الجديدة (ريال)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleConfirm} disabled={!newAmount || parseFloat(newAmount) <= 0}>
            <Edit2 className="h-4 w-4" />
            حفظ القيمة
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Close project dialog ── */}
      <Dialog open={dialog === 'complete'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>إغلاق المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          {hasPendingPayments ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>يوجد دفعات لم تُسدَّد بعد. لا يمكن إغلاق المشروع حتى تُحصَّل جميع الدفعات.</span>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              هل أنت متأكد من إغلاق المشروع <strong>{project.project_name}</strong> وتحديد حالته إلى &ldquo;مكتمل&rdquo;؟
              لن تتمكن من إجراء تغييرات بعد الإغلاق.
            </p>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="success" loading={isPending} onClick={handleConfirm} disabled={hasPendingPayments}>
            <CheckCircle2 className="h-4 w-4" />
            تأكيد الإغلاق
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Hold dialog ── */}
      <Dialog open={dialog === 'hold'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>تعليق المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-gray-600">
            سيتم تعليق مشروع <strong>{project.project_name}</strong> مؤقتاً. يمكنك إعادة تفعيله في أي وقت.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleConfirm} className="bg-amber-600 hover:bg-amber-700 text-white">
            <PauseCircle className="h-4 w-4" />
            تعليق المشروع
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Reactivate dialog ── */}
      <Dialog open={dialog === 'reactivate'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>إعادة تفعيل المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-gray-600">
            هل تريد إعادة تفعيل مشروع <strong>{project.project_name}</strong> والعودة لحالة &ldquo;نشط&rdquo;؟
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleConfirm}>
            <PlayCircle className="h-4 w-4" />
            إعادة التفعيل
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Edit team dialog ── */}
      <Dialog open={dialog === 'team'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>تعديل فريق المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-5">
            {currentProfile.role === 'admin' && (
              <div className="space-y-1.5">
                <Label>الكوردنيتر</Label>
                <Select value={teamCoordinatorId} onChange={(e) => setTeamCoordinatorId(e.target.value)} placeholder="اختر الكوردنيتر">
                  <option value="">— بدون كوردنيتر —</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} — {workloadLabel(coordinatorWorkload[c.id] ?? 0)}</option>
                  ))}
                </Select>
                {teamCoordinatorId && <WorkloadChip count={coordinatorWorkload[teamCoordinatorId] ?? 0} />}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>مهندس المبيعات</Label>
              <Select value={teamSalesId} onChange={(e) => setTeamSalesId(e.target.value)} placeholder="اختر المهندس">
                <option value="">— بدون مهندس —</option>
                {salesEngineers.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} — {workloadLabel(salesWorkload[s.id] ?? 0)}</option>
                ))}
              </Select>
              {teamSalesId && <WorkloadChip count={salesWorkload[teamSalesId] ?? 0} />}
            </div>

            <div className="space-y-1.5">
              <Label>مسؤول التركيب</Label>
              <Select value={teamInstallationId} onChange={(e) => setTeamInstallationId(e.target.value)} placeholder="اختر مسؤول التركيب">
                <option value="">— بدون مسؤول —</option>
                {installationPersons.map((i) => (
                  <option key={i.id} value={i.id}>{i.full_name} — {workloadLabel(installationWorkload[i.id] ?? 0)}</option>
                ))}
              </Select>
              {teamInstallationId && <WorkloadChip count={installationWorkload[teamInstallationId] ?? 0} />}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleConfirm}>
            <Users className="h-4 w-4" />
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Cancel dialog ── */}
      <Dialog open={dialog === 'cancel'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>إلغاء المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>هذا الإجراء لا يُمكن التراجع عنه. سيتم أرشفة المشروع ولن يُحذف من النظام.</span>
            </div>
            <div className="space-y-1.5">
              <Label>سبب الإلغاء *</Label>
              <Input
                placeholder="مثال: العميل ألغى الطلب / توقف التمويل..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>رجوع</Button>
          <Button loading={isPending} onClick={handleConfirm} disabled={!cancelReason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40">
            <XCircle className="h-4 w-4" />
            تأكيد الإلغاء
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Delete project dialog ── */}
      <Dialog open={dialog === 'delete'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>حذف المشروع نهائياً</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <Trash2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                سيتم حذف مشروع <strong>{project.project_name}</strong> بشكل نهائي وكامل — الدفعات، الملفات، سجل النشاطات.
                <br /><strong>لا يمكن التراجع عن هذا الإجراء.</strong>
              </span>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white">
            <Trash2 className="h-4 w-4" />
            حذف نهائياً
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
