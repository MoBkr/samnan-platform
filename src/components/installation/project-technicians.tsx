'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { HardHat, Plus, X, Clock, CheckCircle2, UserPlus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { assignTechnician, removeAssignment, completeAssignment } from '@/lib/actions/technicians'
import { formatDateShort } from '@/lib/utils'
import type { TechnicianWithStatus, TechnicianAssignment, Technician } from '@/types/database'

function plusDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function ProjectTechnicians({
  projectId, technicians, assignments, canEdit,
}: {
  projectId: string
  technicians: TechnicianWithStatus[]
  assignments: (TechnicianAssignment & { technician?: Technician })[]
  canEdit: boolean
}) {
  const [showAssign, setShowAssign] = useState(false)
  const [techId, setTechId] = useState('')
  const [startDate, setStartDate] = useState(plusDays(0))
  const [endDate, setEndDate] = useState(plusDays(14))
  const [isPending, startTransition] = useTransition()

  const active = assignments.filter((a) => a.status === 'active')
  const activeTechIds = new Set(active.map((a) => a.technician_id))

  function submit() {
    if (!techId) { toast.error('اختر فنيًا'); return }
    startTransition(async () => {
      try {
        const result = await assignTechnician({ technicianId: techId, projectId, startDate, endDate })
        if (result?.error) toast.error(result.error)
        else { toast.success('تم تعيين الفني'); setShowAssign(false); setTechId('') }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        const result = await removeAssignment(id)
        if (result?.error) toast.error(result.error)
        else toast.success('تم إزالة الفني')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function complete(id: string) {
    startTransition(async () => {
      try {
        const result = await completeAssignment(id)
        if (result?.error) toast.error(result.error)
        else toast.success('تم إنهاء التعيين')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <HardHat className="h-4 w-4 text-purple-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">فنيو المشروع</h3>
          {active.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{active.length}</span>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => { setTechId(''); setStartDate(plusDays(0)); setEndDate(plusDays(14)); setShowAssign(true) }}>
            <UserPlus className="h-4 w-4" /> تعيين فني
          </Button>
        )}
      </div>

      <div className="p-5 space-y-2">
        {active.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">لم يتم تعيين فنيين بعد</p>
        ) : (
          active.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
                  {(a.technician?.name ?? '؟').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.technician?.name ?? 'فني'}</p>
                    {a.technician?.employee_no && <span className="text-[10px] rounded bg-gray-100 text-gray-500 px-1.5 py-0.5" dir="ltr">#{a.technician.employee_no}</span>}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Clock className="h-3 w-3" /> <span className="font-bold text-brand-800" dir="ltr">{formatDateShort(a.start_date)} — {formatDateShort(a.end_date)}</span>
                  </p>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => complete(a.id)} disabled={isPending} title="إنهاء (اكتمل)" className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(a.id)} disabled={isPending} title="إزالة" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Assign dialog */}
      <Dialog open={showAssign} onClose={() => setShowAssign(false)}>
        <DialogHeader>
          <DialogTitle>تعيين فني للمشروع</DialogTitle>
          <DialogClose onClose={() => setShowAssign(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>الفني</Label>
              <select
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none"
              >
                <option value="">— اختر فنيًا —</option>
                {technicians.filter((t) => t.is_active && !activeTechIds.has(t.id)).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.employee_no ? ` (#${t.employee_no})` : ''}{t.current ? ` — محجوز حتى ${formatDateShort(t.current.end_date)}` : ' — متاح'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">المتاحون تظهر بجانبهم «متاح». المحجوزون يمكن تعيينهم لفترة بعد انتهاء حجزهم.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>من تاريخ</Label>
                <Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>إلى تاريخ</Label>
                <Input type="date" dir="ltr" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-purple-50/60 border border-purple-100 px-3 py-2 text-xs text-purple-700">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              يُحجز الفني طوال هذه الفترة ولا يمكن تعيينه على مشروع آخر يتداخل معها.
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAssign(false)}>إلغاء</Button>
          <Button loading={isPending} onClick={submit}><Plus className="h-4 w-4" /> تعيين</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
