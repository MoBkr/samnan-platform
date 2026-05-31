'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Hammer, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { InstallationStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { scheduleInstallation, updateInstallationStatus, markClientNotified } from '@/lib/actions/installation'
import { formatDateShort } from '@/lib/utils'
import type { Installation, Profile } from '@/types/database'

const INSTALLATION_STATUS_STEPS: Record<string, number> = {
  scheduled: 0,
  confirmed: 1,
  in_progress: 2,
  completed: 3,
  delayed: 0,
  rescheduled: 0,
}

const STEPS = ['مجدول', 'مؤكد', 'قيد التنفيذ', 'مكتمل']

interface InstallationTabProps {
  installations: Installation[]
  projectId: string
  canManage: boolean
  currentProfile: Profile
}

export function InstallationTab({ installations, projectId, canManage, currentProfile }: InstallationTabProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canSchedule = canManage
  const canUpdate = canManage || currentProfile.role === 'installation'

  function handleSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)

    startTransition(async () => {
      try {
        const result = await scheduleInstallation(formData)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم جدولة التركيب'); setShowScheduleDialog(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleStatusUpdate(installationId: string, status: Installation['status']) {
    startTransition(async () => {
      try {
        const result = await updateInstallationStatus(installationId, projectId, status)
        if (result?.error) toast.error(result.error)
        else toast.success('تم تحديث الحالة')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleNotifyClient(installationId: string) {
    startTransition(async () => {
      try {
        const result = await markClientNotified(installationId, projectId)
        if (result?.error) toast.error(result.error)
        else toast.success('تم تسجيل إبلاغ العميل')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <Hammer className="h-4 w-4 text-purple-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">جدول التركيب</h3>
          {installations.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {installations.length}
            </span>
          )}
        </div>
        {canSchedule && (
          <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
            <Plus className="h-4 w-4" />
            جدولة تركيب
          </Button>
        )}
      </div>

      {/* Installations list */}
      {installations.length === 0 ? (
        <EmptyState
          message="لا توجد مواعيد تركيب مجدولة"
          description="اضغط جدولة تركيب لإضافة موعد جديد"
          icon={<Hammer className="h-8 w-8 text-gray-400" />}
        />
      ) : (
        <div className="space-y-3">
          {installations.map((inst) => (
            <InstallationCard
              key={inst.id}
              installation={inst}
              canUpdate={canUpdate}
              isPending={isPending}
              onStatusUpdate={handleStatusUpdate}
              onNotifyClient={handleNotifyClient}
            />
          ))}
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog open={showScheduleDialog} onClose={() => setShowScheduleDialog(false)}>
        <DialogHeader>
          <DialogTitle>جدولة موعد تركيب</DialogTitle>
          <DialogClose onClose={() => setShowScheduleDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <form id="schedule-install-form" onSubmit={handleSchedule} className="space-y-4">
            <div className="space-y-1.5">
              <Label>تاريخ التركيب</Label>
              <Input name="scheduled_date" type="date" dir="ltr" required />
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>إلغاء</Button>
          <Button type="submit" form="schedule-install-form" loading={isPending}>
            <Calendar className="h-4 w-4" />
            جدولة
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function InstallationCard({
  installation,
  canUpdate,
  isPending,
  onStatusUpdate,
  onNotifyClient,
}: {
  installation: Installation
  canUpdate: boolean
  isPending: boolean
  onStatusUpdate: (id: string, status: Installation['status']) => void
  onNotifyClient: (id: string) => void
}) {
  const currentStep = INSTALLATION_STATUS_STEPS[installation.status] ?? 0
  const isDelayed = installation.status === 'delayed' || installation.status === 'rescheduled'
  const isCompleted = installation.status === 'completed'

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${isDelayed ? 'border-red-200' : isCompleted ? 'border-green-200' : 'border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
            isCompleted ? 'bg-green-100' : isDelayed ? 'bg-red-100' : 'bg-purple-100'
          }`}>
            <Hammer className={`h-5 w-5 ${
              isCompleted ? 'text-green-700' : isDelayed ? 'text-red-700' : 'text-purple-700'
            }`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              موعد التركيب
            </p>
            {installation.scheduled_date && (
              <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDateShort(installation.scheduled_date)}
              </p>
            )}
          </div>
        </div>
        <InstallationStatusBadge status={installation.status} />
      </div>

      {/* Confirmation badges */}
      <div className="flex flex-wrap gap-2 px-5 pb-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
          installation.installation_team_confirmed
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          <CheckCircle2 className="h-3 w-3" />
          {installation.installation_team_confirmed ? 'الفريق مؤكد' : 'في انتظار تأكيد الفريق'}
        </span>
        {installation.client_notified ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="h-3 w-3" />
            تم إبلاغ العميل
          </span>
        ) : canUpdate ? (
          <button
            onClick={() => onNotifyClient(installation.id)}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-3 w-3" />
            إبلاغ العميل
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200">
            <CheckCircle2 className="h-3 w-3" />
            لم يُبلَّغ العميل
          </span>
        )}
      </div>

      {/* Progress steps */}
      {!isDelayed && !isCompleted && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentStep
              const isCurrent = idx === currentStep
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`h-1.5 w-full rounded-full ${isDone || isCurrent ? 'bg-purple-500' : 'bg-gray-200'}`} />
                    <span className={`mt-1 text-[10px] font-medium whitespace-nowrap ${isDone ? 'text-purple-600' : isCurrent ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
                      {step}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delay reason */}
      {installation.delay_reason && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>سبب التأخير: {installation.delay_reason}</span>
        </div>
      )}

      {/* Completion photos */}
      {installation.completion_photos.length > 0 && (
        <div className="mx-5 mb-3 flex flex-wrap gap-2">
          {installation.completion_photos.map((photo, idx) => (
            <a
              key={idx}
              href={photo}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              صورة {idx + 1}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      {canUpdate && !isCompleted && !isDelayed && (
        <div className="flex flex-wrap gap-2 border-t border-gray-50 px-5 py-3">
          {installation.status === 'scheduled' && (
            <Button size="sm" variant="outline" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'confirmed')}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              تأكيد الحضور
            </Button>
          )}
          {(installation.status === 'confirmed' || installation.status === 'scheduled') && (
            <Button size="sm" variant="outline" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'in_progress')}>
              <Hammer className="h-3.5 w-3.5" />
              بدء التركيب
            </Button>
          )}
          {installation.status === 'in_progress' && (
            <Button size="sm" variant="success" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'completed')}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              تأكيد الاكتمال
            </Button>
          )}
        </div>
      )}

      {/* Completed footer */}
      {isCompleted && (
        <div className="flex items-center gap-2 border-t border-green-100 bg-green-50 px-5 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">اكتمل التركيب بنجاح</span>
          {installation.completed_at && (
            <span className="text-green-500 text-xs">— {formatDateShort(installation.completed_at)}</span>
          )}
        </div>
      )}
    </div>
  )
}
