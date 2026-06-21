'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Hammer, CheckCircle2, Clock, Calendar, AlertCircle, Timer,
  Upload, FileText, X, Check, ChevronDown, Pencil, RotateCcw, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { InstallationStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  scheduleInstallation, updateInstallationStatus, markClientNotified,
  setInstallExpectedDuration, addInstallStageFile, removeInstallStageFile, updateInstallStageFlags,
  addInstallStageSlot, removeInstallStageSlot,
} from '@/lib/actions/installation'
import { uploadFileDirect } from '@/lib/upload-client'
import { formatDateShort } from '@/lib/utils'
import { INSTALL_STAGES, type InstallStageConfig, type InstallSlot } from '@/lib/constants'
import { ProjectTechnicians } from '@/components/installation/project-technicians'
import type { Installation, Profile, InstallAttachment, Material, TechnicianWithStatus, TechnicianAssignment, Technician } from '@/types/database'

interface InstallationTabProps {
  installations: Installation[]
  projectId: string
  canManage: boolean
  currentProfile: Profile
  material: Material | null
  technicians: TechnicianWithStatus[]
  technicianAssignments: (TechnicianAssignment & { technician?: Technician })[]
}

export function InstallationTab({ installations, projectId, canManage, currentProfile, material, technicians, technicianAssignments }: InstallationTabProps) {
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

  return (
    <div className="space-y-4">
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
        {canSchedule && (
          <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
            <Plus className="h-4 w-4" />
            جدولة تركيب
          </Button>
        )}
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
            <div className="space-y-1.5">
              <Label>تاريخ بدء التركيب</Label>
              <Input name="scheduled_date" type="date" dir="ltr" required />
            </div>
            <div className="space-y-1.5">
              <Label>المدة المتوقعة للتركيب</Label>
              <Input name="expected_duration" placeholder="مثال: أسبوعين / 10 أيام" />
              <p className="text-xs text-gray-400">يحددها مدير التركيبات — يمكن تعديلها لاحقًا.</p>
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

  const requiredStages = INSTALL_STAGES.filter((s) => !s.optional)
  const doneCount = requiredStages.filter((s) => stages[s.key]?.done).length
  const stagePct = Math.round((doneCount / requiredStages.length) * 100)

  const [editingDuration, setEditingDuration] = useState(false)
  const [durationVal, setDurationVal] = useState(installation.expected_duration ?? '')

  function saveDuration() {
    startTransition(async () => {
      try {
        const result = await setInstallExpectedDuration(installation.id, projectId, durationVal)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم حفظ المدة المتوقعة'); setEditingDuration(false) }
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
              <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDateShort(installation.scheduled_date)}
              </p>
            )}
          </div>
        </div>
        <InstallationStatusBadge status={installation.status} />
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

      {/* Stage progress bar */}
      <div className="px-5 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">مراحل المعاينة</span>
          <span className="text-xs font-semibold text-purple-700">{doneCount} / {requiredStages.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${stagePct}%` }} />
        </div>
      </div>

      {/* Inspection stages */}
      <div className="px-5 pb-4 pt-2 space-y-2">
        {INSTALL_STAGES.map((cfg, idx) => (
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
          />
        ))}
      </div>

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
            <span className="text-green-500 text-xs">— {formatDateShort(installation.completed_at)}</span>
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
  index, config, data, installationId, projectId, canEdit, startTransition, materialSlots, materialReady,
}: {
  index: number
  config: InstallStageConfig
  data: { done?: boolean; started?: boolean; files?: InstallAttachment[]; customSlots?: { key: string; label: string }[] }
  installationId: string
  projectId: string
  canEdit: boolean
  startTransition: React.TransitionStartFunction
  materialSlots: InstallSlot[]
  materialReady: boolean
}) {
  const files = data.files ?? []
  const [open, setOpen] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlotLabel, setNewSlotLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingSlot = useRef<string | undefined>(undefined)

  const isDone = !!data.done
  const hasFiles = files.length > 0

  // IRS (dynamic) slots = materials (when ready) + manually-added items.
  const customSlots = data.customSlots ?? []
  const dynamicSlots: InstallSlot[] = config.dynamic ? [...materialSlots, ...customSlots] : []
  // Files whose slot no longer matches any current slot — keep them visible, never lose data.
  const knownSlotKeys = new Set([...(config.slots ?? []), ...dynamicSlots].map((s) => s.key))
  const orphanFiles = config.dynamic ? files.filter((f) => f.slot && !knownSlotKeys.has(f.slot)) : []

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
    <div className={`rounded-xl border transition-colors ${isDone ? 'border-green-200 bg-green-50/40' : hasFiles ? 'border-purple-100 bg-white' : 'border-gray-100 bg-gray-50/40'}`}>
      {/* Stage header (toggles open) */}
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-start">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
          isDone ? 'bg-green-500 text-white' : 'bg-purple-100 text-purple-700'
        }`}>
          {isDone ? <Check className="h-4 w-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{config.label}</span>
            <span className="text-[10px] text-gray-400">{config.en}</span>
            {config.optional && <span className="text-[10px] rounded-full bg-gray-100 text-gray-500 px-1.5 py-0.5">اختياري</span>}
            {hasFiles && <span className="text-[10px] rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5">{files.length} ملف</span>}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-3.5 py-3 space-y-3">
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

          {/* Dynamic IRS — slots from project materials + manual additions */}
          {config.dynamic ? (
            <div className="space-y-2">
              {!materialReady && dynamicSlots.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-700">
                  <Package className="h-4 w-4 shrink-0" />
                  بنود المعاينة هتظهر تلقائياً من المواد لما تبقى «جاهزة». ويمكنك إضافة بنود يدوياً الآن.
                </div>
              )}

              {dynamicSlots.map((slot) => {
                const slotFiles = files.filter((f) => f.slot === slot.key)
                const isCustom = slot.key.startsWith('custom:')
                return (
                  <div key={slot.key} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                        {!isCustom && <Package className="h-3 w-3 text-amber-500" />}
                        {slot.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {canEdit && (
                          <button
                            onClick={() => pickFile(slot.key)}
                            disabled={uploadingSlot !== null}
                            className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50"
                          >
                            {uploadingSlot === slot.key ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            رفع
                          </button>
                        )}
                        {canEdit && isCustom && (
                          <button onClick={() => removeSlot(slot.key)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {slotFiles.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {slotFiles.map((f) => (
                          <FileChip key={f.url} file={f} canEdit={canEdit} onRemove={() => removeFile(f.url)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Orphaned files (slot removed / material renamed) — keep visible */}
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

              {/* Add manual inspection item */}
              {canEdit && (
                addingSlot ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newSlotLabel}
                      onChange={(e) => setNewSlotLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSlot() } }}
                      placeholder="اسم بند المعاينة (مثل Pressure Test)"
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
                    <Plus className="h-3.5 w-3.5" /> إضافة بند معاينة
                  </button>
                )
              )}
            </div>
          ) : config.slots ? (
            <div className="space-y-2">
              {config.slots.map((slot) => {
                const slotFiles = files.filter((f) => f.slot === slot.key)
                return (
                  <div key={slot.key} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700">{slot.label}</span>
                      {canEdit && (
                        <button
                          onClick={() => pickFile(slot.key)}
                          disabled={uploadingSlot !== null}
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                          {uploadingSlot === slot.key ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          رفع
                        </button>
                      )}
                    </div>
                    {slotFiles.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {slotFiles.map((f) => (
                          <FileChip key={f.url} file={f} canEdit={canEdit} onRemove={() => removeFile(f.url)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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

          {/* Done toggle */}
          {canEdit && (
            <div className="flex justify-end pt-1">
              {isDone ? (
                <Button size="sm" variant="outline" onClick={toggleDone} className="text-gray-500">
                  <RotateCcw className="h-3.5 w-3.5" /> إعادة فتح
                </Button>
              ) : (
                <Button size="sm" variant="success" onClick={toggleDone}>
                  <Check className="h-3.5 w-3.5" /> تمت هذه المرحلة
                </Button>
              )}
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
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
