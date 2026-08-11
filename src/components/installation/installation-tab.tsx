'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Hammer, CheckCircle2, Clock, Calendar, AlertCircle, Timer,
  Upload, FileText, X, Check, Pencil, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { InstallationStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  scheduleInstallation, updateInstallationStatus, markClientNotified,
  setInstallExpectedDuration, setInstallDates, addInstallStageFile, removeInstallStageFile, updateInstallStageFlags,
  addInstallStageSlot, removeInstallStageSlot, setInstallStageRejection,
  setInstallSlotState, setInstallSlotRejection,
} from '@/lib/actions/installation'
import { uploadFileDirect } from '@/lib/upload-client'
import { formatDateShort } from '@/lib/utils'
import { INSTALL_STAGES, type InstallStageConfig, type InstallSlot } from '@/lib/constants'
import { ProjectTechnicians } from '@/components/installation/project-technicians'
import { ProjectCustody } from '@/components/installation/project-custody'
import type { Installation, Profile, InstallAttachment, InstallSlotState, InstallStageData, Material, TechnicianWithStatus, TechnicianAssignment, Technician, CustodyEntry } from '@/types/database'

interface InstallationTabProps {
  installations: Installation[]
  projectId: string
  canManage: boolean
  currentProfile: Profile
  material: Material | null
  technicians: TechnicianWithStatus[]
  technicianAssignments: (TechnicianAssignment & { technician?: Technician })[]
  custody: CustodyEntry[]
}

export function InstallationTab({ installations, projectId, canManage, currentProfile, material, technicians, technicianAssignments, custody }: InstallationTabProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Scheduling is the coordinator's job; the installation manager only
  // follows the steps afterwards. Stage data is shared (manager + coordinator).
  const canEdit = canManage || currentProfile.role === 'installation'
  const canSchedule = canManage

  // IRS inspection items are derived from the project's materials, shown once
  // the materials are confirmed ready/delivered.
  const materialReady = material?.status === 'ready' || material?.status === 'delivered'
  const materialSlots: InstallSlot[] = materialReady
    ? (material?.items ?? [])
        .map((it) => ({ it, label: (it.description ?? it.name ?? '').trim() }))
        .filter((x) => x.label)
        .map(({ it, label }) => ({
          key: `mat:${label}`,
          label: it.quantity ? `${label} — ${it.quantity} ${it.unit ?? ''}`.trim() : label,
        }))
    : []

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

  // Overall installation completion — shown first, at the very top of the section
  const primaryStages = installations[0]?.stages ?? {}
  const requiredStages = INSTALL_STAGES.filter((s) => !s.optional)
  const doneStages = requiredStages.filter((s) => primaryStages[s.key]?.done).length
  const installPct = Math.round((doneStages / requiredStages.length) * 100)

  return (
    <div className="space-y-4">
      {/* Installation completion — first thing in the section */}
      {installations.length > 0 && (
        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Hammer className="h-4 w-4 text-purple-600" />
              نسبة إنجاز التركيب
            </span>
            <span className="text-2xl font-extrabold text-purple-700">{installPct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-white overflow-hidden border border-purple-100">
            <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: `${installPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{doneStages} من {requiredStages.length} مراحل مكتملة</p>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <Hammer className="h-4 w-4 text-purple-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">التركيب والمعاينات</h3>
          {installations.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {installations.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Custody — a side concern, kept quiet behind a small chip */}
          <ProjectCustody projectId={projectId} entries={custody} canEdit={canEdit} />
          {canSchedule && (
            <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
              <Plus className="h-4 w-4" />
              جدولة تركيب
            </Button>
          )}
        </div>
      </div>

      {/* Project technicians (shared pool — assign with booking) */}
      <ProjectTechnicians
        projectId={projectId}
        technicians={technicians}
        assignments={technicianAssignments}
        canEdit={canEdit}
      />

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
              projectId={projectId}
              canEdit={canEdit}
              isPending={isPending}
              startTransition={startTransition}
              onStatusUpdate={handleStatusUpdate}
              onNotifyClient={handleNotifyClient}
              materialSlots={materialSlots}
              materialReady={materialReady}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>تاريخ البدء</Label>
                <Input name="scheduled_date" type="date" dir="ltr" required />
              </div>
              <div className="space-y-1.5">
                <Label>الانتهاء المتوقع</Label>
                <Input name="expected_end_date" type="date" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المدة المتوقعة للتركيب</Label>
              <Input name="expected_duration" placeholder="مثال: أسبوعين / 10 أيام" />
              <p className="text-xs text-gray-400">التواريخ والمدة يمكن تعديلها لاحقًا.</p>
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
  projectId,
  canEdit,
  isPending,
  startTransition,
  onStatusUpdate,
  onNotifyClient,
  materialSlots,
  materialReady,
}: {
  installation: Installation
  projectId: string
  canEdit: boolean
  isPending: boolean
  startTransition: React.TransitionStartFunction
  onStatusUpdate: (id: string, status: Installation['status']) => void
  onNotifyClient: (id: string) => void
  materialSlots: InstallSlot[]
  materialReady: boolean
}) {
  const isDelayed = installation.status === 'delayed' || installation.status === 'rescheduled'
  const isCompleted = installation.status === 'completed'
  const stages = installation.stages ?? {}

  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationVal, setDurationVal] = useState(installation.expected_duration ?? '')
  const [editingDates, setEditingDates] = useState(false)
  const [startVal, setStartVal] = useState(installation.scheduled_date ?? '')
  const [endVal, setEndVal] = useState(installation.expected_end_date ?? '')

  function saveDuration() {
    startTransition(async () => {
      try {
        const result = await setInstallExpectedDuration(installation.id, projectId, durationVal)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم حفظ المدة المتوقعة'); setEditingDuration(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function saveDates() {
    startTransition(async () => {
      try {
        const result = await setInstallDates(installation.id, projectId, startVal || null, endVal || null)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم حفظ التواريخ'); setEditingDates(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

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
            <p className="font-semibold text-gray-900 text-sm">موعد التركيب</p>
            {installation.scheduled_date && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <Clock className="h-3 w-3" />
                <span>البدء: <span className="font-bold text-brand-800" dir="ltr">{formatDateShort(installation.scheduled_date)}</span></span>
                {installation.expected_end_date && (
                  <span className="text-gray-400">· الانتهاء المتوقع: <span className="font-bold text-brand-800" dir="ltr">{formatDateShort(installation.expected_end_date)}</span></span>
                )}
              </p>
            )}
          </div>
        </div>
        <InstallationStatusBadge status={installation.status} />
      </div>

      {/* Dates — editable */}
      <div className="mx-5 mb-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
        {editingDates ? (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-500">تاريخ البدء</label>
                <Input type="date" dir="ltr" value={startVal} onChange={(e) => setStartVal(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-500">الانتهاء المتوقع</label>
                <Input type="date" dir="ltr" value={endVal} onChange={(e) => setEndVal(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" loading={isPending} onClick={saveDates}><Check className="h-3.5 w-3.5" /> حفظ</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingDates(false); setStartVal(installation.scheduled_date ?? ''); setEndVal(installation.expected_end_date ?? '') }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-600"><Calendar className="h-3.5 w-3.5 text-gray-400" /> البدء: <strong className="font-bold text-brand-800" dir="ltr">{installation.scheduled_date ? formatDateShort(installation.scheduled_date) : '—'}</strong></span>
            <span className="text-gray-600">الانتهاء المتوقع: <strong className="font-bold text-brand-800" dir="ltr">{installation.expected_end_date ? formatDateShort(installation.expected_end_date) : '—'}</strong></span>
            {canEdit && (
              <button onClick={() => setEditingDates(true)} className="ms-auto text-gray-400 hover:text-brand-600 transition-colors" title="تعديل التواريخ">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expected duration */}
      <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50/50 px-3 py-2.5">
        <Timer className="h-4 w-4 text-purple-600 shrink-0" />
        {editingDuration ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={durationVal}
              onChange={(e) => setDurationVal(e.target.value)}
              placeholder="مثال: أسبوعين / 10 أيام"
              className="h-8 text-sm"
            />
            <Button size="sm" loading={isPending} onClick={saveDuration}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingDuration(false); setDurationVal(installation.expected_duration ?? '') }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <span className="text-xs font-medium text-gray-600">المدة المتوقعة:</span>
            <span className="text-xs font-semibold text-purple-800">
              {installation.expected_duration || 'غير محددة'}
            </span>
            {canEdit && (
              <button onClick={() => setEditingDuration(true)} className="ms-auto text-purple-500 hover:text-purple-700 transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Client notification badge */}
      <div className="flex flex-wrap gap-2 px-5 pb-3">
        {installation.client_notified ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="h-3 w-3" />
            تم إبلاغ العميل
          </span>
        ) : canEdit ? (
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

      {/* Stepper — the installation journey, right to left. Click a step to open it.
          Scrolls on small screens; spreads across the full width on desktop. */}
      <div className="px-5 pb-2">
        <div className="flex items-start w-full overflow-x-auto sm:overflow-visible pb-1">
          {INSTALL_STAGES.map((cfg, idx) => {
            const isLast = idx === INSTALL_STAGES.length - 1
            return (
              <div key={cfg.key} className={`flex items-start shrink-0 ${isLast ? '' : 'sm:flex-1 sm:shrink'}`}>
                <StageStep
                  index={idx + 1}
                  config={cfg}
                  data={stages[cfg.key] ?? {}}
                  materialSlots={materialSlots}
                  selected={selectedStage === cfg.key}
                  onClick={() => setSelectedStage(selectedStage === cfg.key ? null : cfg.key)}
                />
                {!isLast && (
                  <div className={`h-0.5 w-6 sm:w-auto sm:flex-1 mt-[19px] mx-1 rounded shrink-0 sm:shrink ${
                    stages[cfg.key]?.done ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
        {!selectedStage && (
          <p className="text-[11px] text-gray-400 text-center mt-1">اضغط على أي مرحلة لفتح تفاصيلها</p>
        )}
      </div>

      {/* Selected stage details */}
      {selectedStage && (() => {
        const cfg = INSTALL_STAGES.find((s) => s.key === selectedStage)
        if (!cfg) return null
        const idx = INSTALL_STAGES.findIndex((s) => s.key === selectedStage)
        return (
          <div className="px-5 pb-4 pt-2">
            <StageItem
              key={cfg.key}
              index={idx + 1}
              config={cfg}
              data={stages[cfg.key] ?? {}}
              installationId={installation.id}
              projectId={projectId}
              canEdit={canEdit}
              startTransition={startTransition}
              materialSlots={materialSlots}
              materialReady={materialReady}
              onClose={() => setSelectedStage(null)}
            />
          </div>
        )
      })()}

      {/* Delay reason */}
      {installation.delay_reason && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>سبب التأخير: {installation.delay_reason}</span>
        </div>
      )}

      {/* Overall status actions */}
      {canEdit && !isCompleted && !isDelayed && (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 px-5 py-3">
          {(installation.status === 'scheduled' || installation.status === 'confirmed') && (
            <Button size="sm" variant="outline" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'in_progress')}>
              <Hammer className="h-3.5 w-3.5" />
              بدء التركيب
            </Button>
          )}
          {installation.status === 'in_progress' && (
            <>
              <Button size="sm" variant="success" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'completed')}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                تأكيد الاكتمال
              </Button>
              <Button size="sm" variant="ghost" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'scheduled')} className="text-gray-500">
                <RotateCcw className="h-3.5 w-3.5" />
                رجوع للجدولة
              </Button>
            </>
          )}
        </div>
      )}

      {/* Completed footer — with reopen (undo accidental completion) */}
      {isCompleted && (
        <div className="flex items-center gap-2 border-t border-green-100 bg-green-50 px-5 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">اكتمل التركيب بنجاح</span>
          {installation.completed_at && (
            <span className="text-xs font-bold text-brand-800" dir="ltr">— {formatDateShort(installation.completed_at)}</span>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" loading={isPending} onClick={() => onStatusUpdate(installation.id, 'in_progress')}
              className="ms-auto text-green-700 hover:bg-green-100">
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة فتح
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function StageItem({
  index, config, data, installationId, projectId, canEdit, startTransition, materialSlots, materialReady, onClose,
}: {
  index: number
  config: InstallStageConfig
  data: {
    done?: boolean; started?: boolean; files?: InstallAttachment[]; customSlots?: { key: string; label: string }[]
    rejected?: boolean; rejection_note?: string; rejected_at?: string; rejected_by?: string
    rejection_files?: { url: string; name: string }[]
    slotStates?: Record<string, InstallSlotState>
  }
  installationId: string
  projectId: string
  canEdit: boolean
  startTransition: React.TransitionStartFunction
  materialSlots: InstallSlot[]
  materialReady: boolean
  onClose?: () => void
}) {
  const files = data.files ?? []
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlotLabel, setNewSlotLabel] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectFiles, setRejectFiles] = useState<{ url: string; name: string }[]>([])
  const [rejectUploading, setRejectUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rejectInputRef = useRef<HTMLInputElement>(null)
  const pendingSlot = useRef<string | undefined>(undefined)

  const isDone = !!data.done
  const isRejected = !!data.rejected
  const hasFiles = files.length > 0

  async function onRejectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    setRejectUploading(true)
    const added: { url: string; name: string }[] = []
    for (const file of picked) {
      const up = await uploadFileDirect(file, `installations/${projectId}`)
      if ('error' in up) { toast.error(up.error); continue }
      added.push({ url: up.url, name: file.name })
    }
    setRejectUploading(false)
    if (added.length) {
      setRejectFiles((prev) => [...prev, ...added])
      toast.success(`تم رفع ${added.length} مرفق`)
    }
  }

  function submitRejection() {
    if (!rejectNote.trim() && rejectFiles.length === 0) {
      toast.error('اكتب سبب الرفض أو أرفق ملفاً على الأقل')
      return
    }
    startTransition(async () => {
      try {
        const result = await setInstallStageRejection(installationId, projectId, config.key, rejectNote.trim(), rejectFiles)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم تسجيل الرفض'); setRejecting(false); setRejectNote(''); setRejectFiles([]) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function clearRejection() {
    startTransition(async () => {
      try {
        const result = await setInstallStageRejection(installationId, projectId, config.key, null)
        if (result?.error) toast.error(result.error)
        else toast.success('تم إلغاء الرفض — المشكلة اتحلّت')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  // Slots = the stage's fixed standard items + any manually-added extras.
  // (Legacy: a `dynamic` stage also merges the material-derived slots.)
  const customSlots = data.customSlots ?? []
  const allSlots: InstallSlot[] = [
    ...(config.slots ?? []),
    ...(config.dynamic ? materialSlots : []),
    ...customSlots,
  ]
  // Files whose slot no longer matches any current slot — keep them visible, never lose data.
  const knownSlotKeys = new Set(allSlots.map((s) => s.key))
  const orphanFiles = allSlots.length > 0 ? files.filter((f) => f.slot && !knownSlotKeys.has(f.slot)) : []

  function addSlot() {
    if (!newSlotLabel.trim()) return
    startTransition(async () => {
      try {
        const result = await addInstallStageSlot(installationId, projectId, config.key, newSlotLabel.trim())
        if (result?.error) toast.error(result.error)
        else { toast.success('تمت إضافة البند'); setNewSlotLabel(''); setAddingSlot(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function removeSlot(slotKey: string) {
    startTransition(async () => {
      try {
        const result = await removeInstallStageSlot(installationId, projectId, config.key, slotKey)
        if (result?.error) toast.error(result.error)
        else toast.success('تم حذف البند')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function pickFile(slot?: string) {
    pendingSlot.current = slot
    inputRef.current?.click()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    const slot = pendingSlot.current
    setUploadingSlot(slot ?? '__single__')
    startTransition(async () => {
      try {
        const up = await uploadFileDirect(file, `installations/${projectId}`)
        if ('error' in up) { toast.error(up.error); return }
        const result = await addInstallStageFile(installationId, projectId, config.key, { url: up.url, name: file.name, slot })
        if (result?.error) toast.error(result.error)
        else toast.success('تم رفع الملف')
      } catch { toast.error('حدث خطأ غير متوقع') }
      finally { setUploadingSlot(null) }
    })
  }

  function removeFile(url: string) {
    startTransition(async () => {
      try {
        const result = await removeInstallStageFile(installationId, projectId, config.key, url)
        if (result?.error) toast.error(result.error)
        else toast.success('تم حذف الملف')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function toggleDone() {
    startTransition(async () => {
      try {
        const result = await updateInstallStageFlags(installationId, projectId, config.key, { done: !isDone })
        if (result?.error) toast.error(result.error)
        else toast.success(isDone ? 'تم إعادة فتح المرحلة' : 'تم إتمام المرحلة')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function confirmStart() {
    startTransition(async () => {
      try {
        const result = await updateInstallStageFlags(installationId, projectId, config.key, { started: true })
        if (result?.error) toast.error(result.error)
        else toast.success('تم تأكيد بدء الفريق')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className={`rounded-xl border shadow-sm transition-colors ${isRejected ? 'border-red-300 bg-red-50/50' : isDone ? 'border-green-200 bg-green-50/40' : 'border-purple-200 bg-white'}`}>
      {/* Stage header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
          isRejected ? 'bg-red-500 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-purple-600 text-white'
        }`}>
          {isRejected ? <AlertCircle className="h-4 w-4" /> : isDone ? <Check className="h-4 w-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-gray-900">{config.label}</span>
            <span className="text-[11px] text-gray-400" dir="ltr">{config.en}</span>
            {isRejected && <span className="text-[10px] font-bold rounded-full bg-red-100 text-red-700 px-1.5 py-0.5">مرفوض</span>}
            {isDone && <span className="text-[10px] font-bold rounded-full bg-green-100 text-green-700 px-1.5 py-0.5">مكتملة</span>}
            {config.optional && <span className="text-[10px] rounded-full bg-gray-100 text-gray-500 px-1.5 py-0.5">اختياري</span>}
            {hasFiles && <span className="text-[10px] rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5">{files.length} ملف</span>}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} title="إغلاق التفاصيل"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(
        <div className="px-4 py-3.5 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">{config.desc}</p>

          {/* Site inspection: team start confirmation */}
          {config.requiresStart && (
            <div className="flex items-center gap-2">
              {data.started ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="h-3 w-3" /> الفريق أكد البدء
                </span>
              ) : canEdit ? (
                <Button size="sm" variant="outline" onClick={confirmStart}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> تأكيد بدء الفريق
                </Button>
              ) : (
                <span className="text-xs text-gray-400">في انتظار تأكيد بدء الفريق</span>
              )}
            </div>
          )}

          {/* Slotted stages — each item is approved / N-A / rejected on its own */}
          {allSlots.length > 0 ? (
            <div className="space-y-2">
              {allSlots.map((slot) => (
                <SlotItem
                  key={slot.key}
                  slot={slot}
                  state={(data.slotStates ?? {})[slot.key] ?? {}}
                  files={files.filter((f) => f.slot === slot.key)}
                  isCustom={slot.key.startsWith('custom:')}
                  stageKey={config.key}
                  installationId={installationId}
                  projectId={projectId}
                  canEdit={canEdit}
                  uploading={uploadingSlot === slot.key}
                  uploadDisabled={uploadingSlot !== null}
                  onPickFile={() => pickFile(slot.key)}
                  onRemoveFile={removeFile}
                  onRemoveSlot={() => removeSlot(slot.key)}
                  startTransition={startTransition}
                />
              ))}

              {/* Orphaned files (slot removed / renamed) — keep visible */}
              {orphanFiles.length > 0 && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">بنود أخرى / محذوفة</span>
                  <div className="mt-1.5 space-y-1">
                    {orphanFiles.map((f) => (
                      <FileChip key={f.url} file={f} canEdit={canEdit} onRemove={() => removeFile(f.url)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Add an extra inspection item */}
              {canEdit && (
                addingSlot ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newSlotLabel}
                      onChange={(e) => setNewSlotLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSlot() } }}
                      placeholder="اسم بند إضافي"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={addSlot}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setAddingSlot(false); setNewSlotLabel('') }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSlot(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> إضافة بند
                  </button>
                )
              )}
            </div>
          ) : (
            /* Single-file stages */
            <div>
              {files.length > 0 ? (
                <div className="space-y-1">
                  {files.map((f) => (
                    <FileChip key={f.url} file={f} canEdit={canEdit} onRemove={() => removeFile(f.url)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">لا توجد ملفات بعد</p>
              )}
              {canEdit && (
                <Button size="sm" variant="outline" className="mt-2" disabled={uploadingSlot !== null} onClick={() => pickFile()}>
                  {uploadingSlot === '__single__' ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  رفع ملف
                </Button>
              )}
            </div>
          )}

          {/* Rejection banner — shows the problem/rejection reason */}
          {isRejected && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-red-700">مرفوض / يوجد مشكلة</p>
                  {data.rejection_note && (
                    <p className="text-sm text-red-800 mt-0.5 whitespace-pre-wrap">{data.rejection_note}</p>
                  )}
                  {(data.rejection_files ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(data.rejection_files ?? []).map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50">
                          <FileText className="h-3 w-3" /> {f.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-red-500 mt-1">
                    {data.rejected_by ? `${data.rejected_by} · ` : ''}
                    {data.rejected_at ? formatDateShort(data.rejected_at) : ''}
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={clearRejection}
                    className="shrink-0 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                    <Check className="h-3.5 w-3.5" /> تم الحل
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Reject form — note and/or attachments */}
          {canEdit && rejecting && (
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-2">
              <Label className="text-xs text-red-700">سبب الرفض / المشكلة — نص و/أو مرفقات</Label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                placeholder="مثال: البراند غير مطابق للمواصفات — تم رفض الصنف"
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
              />

              {/* Rejection attachments */}
              {rejectFiles.length > 0 && (
                <div className="space-y-1">
                  {rejectFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-2.5 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="flex-1 truncate text-xs text-gray-700">{f.name}</span>
                      <button type="button" onClick={() => setRejectFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => rejectInputRef.current?.click()} disabled={rejectUploading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                {rejectUploading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                إرفاق ملف / صورة
              </button>
              <input ref={rejectInputRef} type="file" multiple accept="image/*,application/pdf,.dwg,.dxf,.xlsx,.xls,.csv" className="hidden" onChange={onRejectFiles} />

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={submitRejection} className="bg-red-600 hover:bg-red-700 text-white">
                  <AlertCircle className="h-3.5 w-3.5" /> تسجيل الرفض
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setRejecting(false); setRejectNote(''); setRejectFiles([]) }}>إلغاء</Button>
              </div>
            </div>
          )}

          {/* Stage actions */}
          {canEdit && !rejecting && (
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {!isRejected && (
                <Button size="sm" variant="outline" onClick={() => { setRejecting(true); setRejectNote('') }}
                  className="text-red-600 border-red-200 hover:bg-red-50">
                  <AlertCircle className="h-3.5 w-3.5" /> رفض / فيه مشكلة
                </Button>
              )}
              {isDone ? (
                <Button size="sm" variant="outline" onClick={toggleDone} className="text-gray-500">
                  <RotateCcw className="h-3.5 w-3.5" /> إعادة فتح
                </Button>
              ) : (
                <Button size="sm" variant="success" onClick={toggleDone} disabled={isRejected}
                  title={isRejected ? 'لا يمكن إتمام مرحلة مرفوضة — احسم المشكلة أولاً' : undefined}>
                  <Check className="h-3.5 w-3.5" /> تمت هذه المرحلة
                </Button>
              )}
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*,application/pdf,.dwg,.dxf,.xlsx,.xls,.csv" className="hidden" onChange={onFile} />
        </div>
      )}
    </div>
  )
}

// One step in the installation stepper — status at a glance; click to open it.
function StageStep({
  index, config, data, materialSlots, selected, onClick,
}: {
  index: number
  config: InstallStageConfig
  data: InstallStageData
  materialSlots: InstallSlot[]
  selected: boolean
  onClick: () => void
}) {
  const done = !!data.done
  const slots: InstallSlot[] = [
    ...(config.slots ?? []),
    ...(config.dynamic ? materialSlots : []),
    ...(data.customSlots ?? []),
  ]
  const slotStates = data.slotStates ?? {}
  const applicable = slots.filter((s) => !slotStates[s.key]?.na)
  const doneSlots = applicable.filter((s) => slotStates[s.key]?.done).length
  const rejectedSlots = applicable.filter((s) => slotStates[s.key]?.rejected).length
  const bad = !!data.rejected || rejectedSlots > 0

  return (
    <button
      onClick={onClick}
      className="group flex w-24 sm:w-28 shrink-0 flex-col items-center gap-1.5 px-1"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all
        ${bad ? 'border-red-500 bg-red-500 text-white'
          : done ? 'border-green-500 bg-green-500 text-white'
          : selected ? 'border-purple-600 bg-purple-600 text-white'
          : 'border-gray-300 bg-white text-gray-500 group-hover:border-purple-400 group-hover:text-purple-600'}
        ${selected ? 'ring-4 ring-purple-200' : ''}`}>
        {bad ? <AlertCircle className="h-4.5 w-4.5" /> : done ? <Check className="h-5 w-5" /> : index}
      </span>

      <span className={`text-[11px] font-bold leading-tight text-center ${
        selected ? 'text-purple-700' : bad ? 'text-red-700' : done ? 'text-green-700' : 'text-gray-600'
      }`}>
        {config.label}
      </span>

      {applicable.length > 0 ? (
        <span className={`text-[10px] font-semibold ${rejectedSlots > 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {doneSlots}/{applicable.length}
          {rejectedSlots > 0 && ` · ${rejectedSlots} مرفوض`}
        </span>
      ) : (
        <span className="text-[10px] text-gray-400">
          {bad ? 'مرفوض' : done ? 'مكتملة' : config.optional ? 'اختياري' : '—'}
        </span>
      )}
    </button>
  )
}

// A single inspection item (Tank, Pipe, Pressure Test, …) — approved, marked
// not-applicable, or rejected on its own with its own note and attachments.
function SlotItem({
  slot, state, files, isCustom, stageKey, installationId, projectId, canEdit,
  uploading, uploadDisabled, onPickFile, onRemoveFile, onRemoveSlot, startTransition,
}: {
  slot: InstallSlot
  state: InstallSlotState
  files: InstallAttachment[]
  isCustom: boolean
  stageKey: string
  installationId: string
  projectId: string
  canEdit: boolean
  uploading: boolean
  uploadDisabled: boolean
  onPickFile: () => void
  onRemoveFile: (url: string) => void
  onRemoveSlot: () => void
  startTransition: React.TransitionStartFunction
}) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [rejFiles, setRejFiles] = useState<{ url: string; name: string }[]>([])
  const [uploadingRej, setUploadingRej] = useState(false)
  const rejInputRef = useRef<HTMLInputElement>(null)

  const done = !!state.done
  const na = !!state.na
  const rejected = !!state.rejected

  function setDone(v: boolean) {
    startTransition(async () => {
      try {
        const r = await setInstallSlotState(installationId, projectId, stageKey, slot.key, { done: v })
        if (r?.error) toast.error(r.error)
        else toast.success(v ? 'تم اعتماد البند' : 'تم إعادة فتح البند')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }
  function setNA(v: boolean) {
    startTransition(async () => {
      try {
        const r = await setInstallSlotState(installationId, projectId, stageKey, slot.key, { na: v })
        if (r?.error) toast.error(r.error)
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }
  async function pickRejFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    setUploadingRej(true)
    const added: { url: string; name: string }[] = []
    for (const f of picked) {
      const up = await uploadFileDirect(f, `installations/${projectId}`)
      if ('error' in up) { toast.error(up.error); continue }
      added.push({ url: up.url, name: f.name })
    }
    setUploadingRej(false)
    if (added.length) setRejFiles((prev) => [...prev, ...added])
  }
  function submitReject() {
    if (!note.trim() && rejFiles.length === 0) { toast.error('اكتب سبب المشكلة أو أرفق ملفاً'); return }
    startTransition(async () => {
      try {
        const r = await setInstallSlotRejection(installationId, projectId, stageKey, slot.key, note.trim(), rejFiles)
        if (r?.error) toast.error(r.error)
        else { toast.success('تم تسجيل الرفض للبند'); setRejecting(false); setNote(''); setRejFiles([]) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }
  function clearReject() {
    startTransition(async () => {
      try {
        const r = await setInstallSlotRejection(installationId, projectId, stageKey, slot.key, null)
        if (r?.error) toast.error(r.error)
        else toast.success('تم حل مشكلة البند')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${rejected ? 'border-red-200 bg-red-50/50' : done ? 'border-green-200 bg-green-50/40' : na ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-100 bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800" dir="ltr">
          {rejected ? <AlertCircle className="h-4 w-4 text-red-600" />
            : done ? <Check className="h-4 w-4 text-green-600" />
            : <span className="h-2 w-2 rounded-full bg-gray-300" />}
          {slot.label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {rejected && <span className="text-[10px] font-bold rounded-full bg-red-100 text-red-700 px-1.5 py-0.5">مرفوض</span>}
          {done && <span className="text-[10px] font-bold rounded-full bg-green-100 text-green-700 px-1.5 py-0.5">معتمد</span>}
          {na && <span className="text-[10px] rounded-full bg-gray-200 text-gray-600 px-1.5 py-0.5">لا ينطبق</span>}
          {canEdit && (
            <button onClick={onPickFile} disabled={uploadDisabled}
              className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50">
              {uploading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} رفع
            </button>
          )}
          {canEdit && isCustom && (
            <button onClick={onRemoveSlot} className="text-gray-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>

      {/* Files */}
      {files.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {files.map((f) => <FileChip key={f.url} file={f} canEdit={canEdit} onRemove={() => onRemoveFile(f.url)} />)}
        </div>
      )}

      {/* Rejection details */}
      {rejected && (
        <div className="mt-2 rounded-md border border-red-200 bg-white px-2.5 py-2">
          {state.rejection_note && <p className="text-xs text-red-800 whitespace-pre-wrap">{state.rejection_note}</p>}
          {(state.rejection_files ?? []).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(state.rejection_files ?? []).map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-700 hover:bg-red-50">
                  <FileText className="h-3 w-3" /> {f.name}
                </a>
              ))}
            </div>
          )}
          <p className="text-[10px] text-red-500 mt-1">
            {state.rejected_by ? `${state.rejected_by} · ` : ''}{state.rejected_at ? formatDateShort(state.rejected_at) : ''}
          </p>
        </div>
      )}

      {/* Reject form */}
      {canEdit && rejecting && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50/60 p-2.5 space-y-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="سبب المشكلة / الرفض لهذا البند"
            className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200" />
          {rejFiles.length > 0 && (
            <div className="space-y-1">
              {rejFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-red-100 bg-white px-2 py-1">
                  <FileText className="h-3 w-3 text-red-400 shrink-0" />
                  <span className="flex-1 truncate text-[11px] text-gray-700">{f.name}</span>
                  <button onClick={() => setRejFiles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => rejInputRef.current?.click()} disabled={uploadingRej}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
            {uploadingRej ? <Clock className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} إرفاق ملف / صورة
          </button>
          <input ref={rejInputRef} type="file" multiple accept="image/*,application/pdf,.dwg,.dxf,.xlsx,.xls,.csv" className="hidden" onChange={pickRejFiles} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submitReject} className="bg-red-600 hover:bg-red-700 text-white">تسجيل الرفض</Button>
            <Button size="sm" variant="outline" onClick={() => { setRejecting(false); setNote(''); setRejFiles([]) }}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {canEdit && !rejecting && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {rejected ? (
            <Button size="sm" variant="outline" onClick={clearReject} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <Check className="h-3.5 w-3.5" /> تم الحل
            </Button>
          ) : done ? (
            <Button size="sm" variant="outline" onClick={() => setDone(false)} className="text-gray-500">
              <RotateCcw className="h-3.5 w-3.5" /> إعادة فتح
            </Button>
          ) : (
            <>
              <Button size="sm" variant="success" onClick={() => setDone(true)} disabled={na}>
                <Check className="h-3.5 w-3.5" /> تم
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                <AlertCircle className="h-3.5 w-3.5" /> مشكلة / رفض
              </Button>
              <button onClick={() => setNA(!na)}
                className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${na ? 'border-gray-300 bg-gray-100 text-gray-600' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}>
                {na ? 'إلغاء «لا ينطبق»' : 'لا ينطبق'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FileChip({ file, canEdit, onRemove }: { file: InstallAttachment; canEdit: boolean; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
      <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-gray-700 hover:text-brand-700 truncate flex-1">
        {file.name}
      </a>
      {canEdit && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
