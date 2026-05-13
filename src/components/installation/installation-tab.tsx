'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Hammer, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { InstallationStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { scheduleInstallation, updateInstallationStatus } from '@/lib/actions/installation'
import { formatDateShort } from '@/lib/utils'
import type { Installation, Profile, Payment } from '@/types/database'

interface InstallationTabProps {
  installations: Installation[]
  projectId: string
  currentProfile: Profile
  payments: Payment[]
}

export function InstallationTab({ installations, projectId, currentProfile, payments }: InstallationTabProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canSchedule = ['coordinator', 'admin'].includes(currentProfile.role)
  const canUpdate = ['installation', 'coordinator', 'admin'].includes(currentProfile.role)
  const installationPaymentPaid = payments.some((p) => p.type === 'installation' && p.status === 'paid')

  function handleSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)

    startTransition(async () => {
      const result = await scheduleInstallation(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('تم جدولة التركيب'); setShowScheduleDialog(false) }
    })
  }

  function handleStatusUpdate(installationId: string, status: Installation['status']) {
    startTransition(async () => {
      const result = await updateInstallationStatus(installationId, projectId, status)
      if (result?.error) toast.error(result.error)
      else toast.success('تم تحديث الحالة')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">جدول التركيب</h3>
        {canSchedule && (
          <Button
            size="sm"
            onClick={() => setShowScheduleDialog(true)}
            disabled={!installationPaymentPaid && installations.length === 0}
            title={!installationPaymentPaid ? 'دفعة التركيب غير مكتملة' : undefined}
          >
            <Plus className="h-4 w-4" />
            جدولة تركيب
          </Button>
        )}
      </div>

      {!installationPaymentPaid && installations.length === 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          دفعة التركيب غير مسددة — يُنصح بتسوية الدفعة قبل الجدولة
        </div>
      )}

      {installations.length === 0 ? (
        <EmptyState
          message="لا توجد مواعيد تركيب"
          icon={<Hammer className="h-8 w-8 text-gray-400" />}
        />
      ) : (
        <div className="space-y-3">
          {installations.map((inst) => (
            <Card key={inst.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      تركيب — {formatDateShort(inst.scheduled_date)}
                    </p>
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      {inst.installation_team_confirmed && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          الفريق مؤكد
                        </span>
                      )}
                      {inst.completed_at && (
                        <span>اكتمل: {formatDateShort(inst.completed_at)}</span>
                      )}
                    </div>
                    {inst.delay_reason && (
                      <p className="mt-1 text-sm text-red-600">سبب التأخير: {inst.delay_reason}</p>
                    )}
                  </div>
                  <InstallationStatusBadge status={inst.status} />
                </div>

                {inst.completion_photos.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {inst.completion_photos.map((photo, idx) => (
                      <a key={idx} href={photo} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        صورة {idx + 1}
                      </a>
                    ))}
                  </div>
                )}

                {canUpdate && inst.status !== 'completed' && inst.status !== 'delayed' && (
                  <div className="flex flex-wrap gap-2">
                    {inst.status === 'scheduled' && (
                      <Button size="sm" variant="outline" loading={isPending} onClick={() => handleStatusUpdate(inst.id, 'confirmed')}>
                        تأكيد الحضور
                      </Button>
                    )}
                    {(inst.status === 'confirmed' || inst.status === 'scheduled') && (
                      <Button size="sm" variant="outline" loading={isPending} onClick={() => handleStatusUpdate(inst.id, 'in_progress')}>
                        بدء التركيب
                      </Button>
                    )}
                    {inst.status === 'in_progress' && (
                      <Button size="sm" variant="success" loading={isPending} onClick={() => handleStatusUpdate(inst.id, 'completed')}>
                        تأكيد الاكتمال
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
          <Button type="submit" form="schedule-install-form" loading={isPending}>جدولة</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
