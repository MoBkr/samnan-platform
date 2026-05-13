'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, User, Calendar, DollarSign, FileText, TrendingUp, CheckCircle2, PauseCircle, XCircle, PlayCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { ProjectStatusBadge } from '@/components/shared/status-badge'
import { PaymentsTab } from '@/components/payments/payments-tab'
import { MaterialsTab } from '@/components/supply/materials-tab'
import { InstallationTab } from '@/components/installation/installation-tab'
import { ActivityTab } from '@/components/projects/activity-tab'
import { updateProjectStatus } from '@/lib/actions/projects'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project, Payment, Material, SupplyOrder, Installation, ActivityLog, Profile } from '@/types/database'

type Tab = 'payments' | 'materials' | 'installation' | 'activity'
type ActionDialog = 'complete' | 'cancel' | 'hold' | 'reactivate' | null

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
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalPaid = payments.reduce((sum, p) => sum + (p.paid_amount ?? 0), 0)
  const totalDue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const collectionPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  const { stage, label: stageLabel } = getLifecycleStage(payments, materials, supplyOrders, installations)

  const canManage = currentProfile.role === 'coordinator' || currentProfile.role === 'admin'
  const isActive = project.status === 'active'
  const isOnHold = project.status === 'on_hold'
  const isFinished = project.status === 'completed' || project.status === 'cancelled'

  const hasPendingPayments = payments.some(p => p.status === 'pending' || p.status === 'partial')

  function handleAction(action: ActionDialog) {
    if (action === 'cancel') setCancelReason('')
    setDialog(action)
  }

  function handleConfirm() {
    startTransition(async () => {
      let result: { error?: string } | undefined

      if (dialog === 'complete') {
        result = await updateProjectStatus(project.id, 'completed')
      } else if (dialog === 'hold') {
        result = await updateProjectStatus(project.id, 'on_hold')
      } else if (dialog === 'reactivate') {
        result = await updateProjectStatus(project.id, 'active')
      } else if (dialog === 'cancel') {
        if (!cancelReason.trim()) {
          toast.error('يرجى إدخال سبب الإلغاء')
          return
        }
        result = await updateProjectStatus(project.id, 'cancelled', cancelReason.trim())
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        const labels: Record<string, string> = {
          complete: 'تم إغلاق المشروع بنجاح',
          hold: 'تم تعليق المشروع',
          reactivate: 'تم إعادة تفعيل المشروع',
          cancel: 'تم إلغاء المشروع',
        }
        toast.success(labels[dialog!] ?? 'تم تحديث حالة المشروع')
        setDialog(null)
      }
    })
  }

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

        {/* Project action buttons */}
        {canManage && !isFinished && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
            {isActive && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleAction('complete')}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  إغلاق المشروع
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction('hold')}
                  className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <PauseCircle className="h-4 w-4" />
                  تعليق المشروع
                </Button>
              </>
            )}
            {isOnHold && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('reactivate')}
                className="gap-1.5 text-brand-700 border-brand-200 hover:bg-brand-50"
              >
                <PlayCircle className="h-4 w-4" />
                إعادة تفعيل
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('cancel')}
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
              إلغاء المشروع
            </Button>
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

      {/* ── Close project dialog ── */}
      <Dialog open={dialog === 'complete'} onClose={() => setDialog(null)}>
        <DialogHeader>
          <DialogTitle>إغلاق المشروع</DialogTitle>
          <DialogClose onClose={() => setDialog(null)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {hasPendingPayments && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>يوجد دفعات لم تُسدَّد بعد. لا يمكن إغلاق المشروع حتى تُحصَّل جميع الدفعات.</span>
              </div>
            )}
            {!hasPendingPayments && (
              <p className="text-sm text-gray-600">
                هل أنت متأكد من إغلاق المشروع <strong>{project.project_name}</strong> وتحديد حالته إلى &ldquo;مكتمل&rdquo;؟
                لن تتمكن من إجراء تغييرات بعد الإغلاق.
              </p>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
          <Button
            variant="success"
            loading={isPending}
            onClick={handleConfirm}
            disabled={hasPendingPayments}
          >
            <CheckCircle2 className="h-4 w-4" />
            تأكيد الإغلاق
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Hold project dialog ── */}
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
          <Button
            loading={isPending}
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
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

      {/* ── Cancel project dialog ── */}
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
          <Button
            loading={isPending}
            onClick={handleConfirm}
            disabled={!cancelReason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            <XCircle className="h-4 w-4" />
            تأكيد الإلغاء
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
