'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, X, Paperclip, Trash2, Edit2, Calendar, AlertTriangle,
  ExternalLink, Upload, Flag, MapPin, User, Truck, Hash, ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { uploadFileDirect } from '@/lib/upload-client'
import {
  createPurchaseRequest, updatePurchaseRequest, movePurchaseRequest,
  deletePurchaseRequest, addBrAttachment, removeBrAttachment,
} from '@/lib/actions/purchase-requests'
import { BR_STAGES, BR_STAGE_LABELS, BR_PRIORITY_LABELS } from '@/lib/constants'
import { formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PurchaseRequest, BrStage, Profile } from '@/types/database'

const STAGE_ACCENT: Record<BrStage, string> = {
  create: 'border-t-slate-400',
  manager_approval: 'border-t-blue-500',
  inventory: 'border-t-amber-500',
  release: 'border-t-indigo-500',
  finance: 'border-t-emerald-500',
  logistics: 'border-t-purple-500',
  completed: 'border-t-green-600',
}

const todaySA = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())

interface Props {
  requests: PurchaseRequest[]
  users: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  projectNames: string[]
  currentProfile: Profile
}

type BrForm = {
  br_number: string; release_number: string; project_name: string; supplier_name: string
  engineer_id: string; location: string; due_date: string; started_at: string
  priority: 'important' | 'medium'; status: 'not_started' | 'started'; progress: string; stage: BrStage; notes: string
}

const EMPTY: BrForm = {
  br_number: '', release_number: '', project_name: '', supplier_name: '',
  engineer_id: '', location: '', due_date: '', started_at: '',
  priority: 'medium', status: 'not_started', progress: '0', stage: 'create', notes: '',
}

export function PurchaseBoard({ requests, users, projectNames }: Props) {
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PurchaseRequest | null>(null)
  const [form, setForm] = useState<BrForm>({ ...EMPTY })
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<BrStage | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const today = todaySA()

  function openNew() {
    setEditing(null); setForm({ ...EMPTY }); setDialogOpen(true)
  }
  function openEdit(r: PurchaseRequest) {
    setEditing(r)
    setForm({
      br_number: r.br_number ?? '', release_number: r.release_number ?? '', project_name: r.project_name ?? '',
      supplier_name: r.supplier_name ?? '', engineer_id: r.engineer_id ?? '', location: r.location ?? '',
      due_date: r.due_date ?? '', started_at: r.started_at ?? '', priority: r.priority,
      status: r.status, progress: String(r.progress ?? 0), stage: r.stage, notes: r.notes ?? '',
    })
    setDialogOpen(true)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.project_name.trim()) { toast.error('يرجى إدخال اسم المشروع'); return }
    startTransition(async () => {
      try {
        if (editing) {
          const res = await updatePurchaseRequest(editing.id, {
            br_number: form.br_number || null, release_number: form.release_number || null,
            project_name: form.project_name || null, supplier_name: form.supplier_name || null,
            engineer_id: form.engineer_id || null, location: form.location || null,
            due_date: form.due_date || null, started_at: form.started_at || null,
            priority: form.priority, status: form.status, progress: parseInt(form.progress || '0', 10) || 0,
            stage: form.stage, notes: form.notes || null,
          })
          if (res?.error) { toast.error(res.error); return }
          toast.success('تم تحديث الطلب')
        } else {
          const fd = new FormData()
          Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))
          const res = await createPurchaseRequest(fd)
          if (res?.error) { toast.error(res.error); return }
          toast.success('تم إنشاء الطلب')
        }
        setDialogOpen(false)
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleMove(id: string, stage: BrStage) {
    startTransition(async () => {
      try {
        const res = await movePurchaseRequest(id, stage)
        if (res?.error) toast.error(res.error)
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('حذف طلب الشراء نهائياً؟')) return
    startTransition(async () => {
      try {
        const res = await deletePurchaseRequest(id)
        if (res?.error) toast.error(res.error); else toast.success('تم الحذف')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleAttachUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''
    if (!files.length || !editing) return
    setUploading(true)
    startTransition(async () => {
      try {
        for (const f of files) {
          const up = await uploadFileDirect(f, 'purchase')
          if ('error' in up) { toast.error(up.error); continue }
          await addBrAttachment(editing.id, { url: up.url, name: f.name })
        }
        toast.success('تم رفع المرفق')
        // reflect locally
        setEditing((cur) => cur ? { ...cur, attachments: [...cur.attachments] } : cur)
      } catch { toast.error('تعذّر رفع المرفق') }
      finally { setUploading(false) }
    })
  }

  const overdueCount = requests.filter((r) => r.stage !== 'completed' && r.due_date && r.due_date < today).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span><span className="font-bold text-gray-800">{requests.length}</span> طلب</span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
              <AlertTriangle className="h-3 w-3" /> {overdueCount} متأخر
            </span>
          )}
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> طلب شراء جديد</Button>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {BR_STAGES.map((stage) => {
          const items = requests.filter((r) => r.stage === stage)
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage) }}
              onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('id'); if (id) handleMove(id, stage); setDragOver(null); setDragId(null) }}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-2xl border bg-gray-50/70 transition-colors',
                dragOver === stage ? 'border-brand-300 bg-brand-50/50' : 'border-gray-100'
              )}
            >
              <div className={cn('flex items-center justify-between rounded-t-2xl border-t-4 bg-white px-3 py-2.5', STAGE_ACCENT[stage])}>
                <span className="text-sm font-bold text-gray-800">{BR_STAGE_LABELS[stage]}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">{items.length}</span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-300">— فارغ —</p>
                )}
                {items.map((r) => (
                  <BrCard key={r.id} r={r} today={today} users={users}
                    dragging={dragId === r.id}
                    onDragStart={(e) => { e.dataTransfer.setData('id', r.id); setDragId(r.id) }}
                    onDragEnd={() => setDragId(null)}
                    onEdit={() => openEdit(r)} onDelete={() => handleDelete(r.id)} onMove={handleMove} disabled={isPending} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'تعديل طلب الشراء' : 'طلب شراء جديد'}</DialogTitle>
          <DialogClose onClose={() => setDialogOpen(false)} />
        </DialogHeader>
        <DialogContent className="max-h-[62vh] overflow-y-auto">
          <form id="br-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>اسم المشروع *</Label>
              <Input list="br-projects" required value={form.project_name}
                onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                placeholder="اختر من القائمة أو اكتب يدوياً" />
              <datalist id="br-projects">{projectNames.map((n) => <option key={n} value={n} />)}</datalist>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>رقم BR</Label>
                <Input dir="ltr" className="text-start" value={form.br_number} onChange={(e) => setForm((f) => ({ ...f, br_number: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>رقم التعميد</Label>
                <Input dir="ltr" className="text-start" value={form.release_number} onChange={(e) => setForm((f) => ({ ...f, release_number: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>اسم المورّد</Label>
                <Input value={form.supplier_name} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>المهندس المسؤول</Label>
                <Select value={form.engineer_id} onChange={(e) => setForm((f) => ({ ...f, engineer_id: e.target.value }))} placeholder="اختر">
                  <option value="">— بدون —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </Select></div>
              <div className="space-y-1.5"><Label>الموقع</Label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>المرحلة</Label>
                <Select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as BrStage }))}>
                  {BR_STAGES.map((s) => <option key={s} value={s}>{BR_STAGE_LABELS[s]}</option>)}
                </Select></div>
              <div className="space-y-1.5"><Label>تاريخ بدء الطلب</Label>
                <Input type="date" dir="ltr" value={form.started_at} onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>تاريخ الاستحقاق (الوصول المتوقع)</Label>
                <Input type="date" dir="ltr" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>الأولوية</Label>
                <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as 'important' | 'medium' }))}>
                  <option value="medium">متوسط</option><option value="important">مهم</option>
                </Select></div>
              <div className="space-y-1.5"><Label>الحالة</Label>
                <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'not_started' | 'started' }))}>
                  <option value="not_started">غير مبدوء</option><option value="started">مبدوء</option>
                </Select></div>
            </div>

            <div className="space-y-1.5">
              <Label>نسبة التقدّم: {form.progress}%</Label>
              <input type="range" min="0" max="100" step="5" value={form.progress}
                onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))} className="w-full accent-brand-600" />
            </div>

            <div className="space-y-1.5"><Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="اختياري" /></div>

            {/* Attachments (edit mode only) */}
            {editing && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">المرفقات (تأكيد الطلب المرسل للمورّد)</p>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
                    <Paperclip className="h-3.5 w-3.5" /> {uploading ? 'جاري الرفع...' : 'إضافة مرفق'}
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleAttachUpload} />
                </div>
                {editing.attachments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">لا توجد مرفقات</p>
                ) : (
                  <ul className="space-y-1.5">
                    {editing.attachments.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2 text-xs">
                        <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="flex-1 truncate text-gray-700">{a.name}</span>
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline shrink-0">عرض</a>
                        <button type="button" onClick={() => startTransition(async () => { await removeBrAttachment(editing.id, i); setEditing((c) => c ? { ...c, attachments: c.attachments.filter((_, j) => j !== i) } : c) })}
                          className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button type="submit" form="br-form" loading={isPending}>{editing ? 'حفظ' : 'إنشاء الطلب'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function BrCard({ r, today, users, dragging, onDragStart, onDragEnd, onEdit, onDelete, onMove, disabled }: {
  r: PurchaseRequest
  today: string
  users: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  dragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onEdit: () => void
  onDelete: () => void
  onMove: (id: string, stage: BrStage) => void
  disabled: boolean
}) {
  const overdue = r.stage !== 'completed' && r.due_date && r.due_date < today
  const dueToday = r.due_date === today && r.stage !== 'completed'
  const engineer = users.find((u) => u.id === r.engineer_id)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-xl border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all',
        overdue ? 'border-red-200' : 'border-gray-100 hover:border-brand-200',
        dragging && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{r.project_name}</p>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
          r.priority === 'important' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}>
          {BR_PRIORITY_LABELS[r.priority]}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs text-gray-500">
        {r.br_number && <p className="flex items-center gap-1.5"><Hash className="h-3 w-3 shrink-0" /> BR: <span dir="ltr" className="font-medium text-gray-700">{r.br_number}</span></p>}
        {r.release_number && <p className="flex items-center gap-1.5"><Flag className="h-3 w-3 shrink-0" /> تعميد: <span dir="ltr" className="font-medium text-gray-700">{r.release_number}</span></p>}
        {r.supplier_name && <p className="flex items-center gap-1.5"><Truck className="h-3 w-3 shrink-0" /> {r.supplier_name}</p>}
        {engineer && <p className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" /> {engineer.full_name}</p>}
        {r.location && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /> {r.location}</p>}
      </div>

      {/* progress */}
      <div className="mt-2.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, r.progress)}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{r.progress}%</span>
          <span className={cn('text-[10px] font-medium', r.status === 'started' ? 'text-emerald-600' : 'text-gray-400')}>
            {r.status === 'started' ? 'مبدوء' : 'غير مبدوء'}
          </span>
        </div>
      </div>

      {/* due date */}
      {r.due_date && (
        <div className={cn('mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
          overdue ? 'bg-red-50 text-red-600' : dueToday ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500')}>
          <Calendar className="h-3 w-3" />
          الاستحقاق: {formatDateShort(r.due_date)}{overdue ? ' (متأخر)' : dueToday ? ' (اليوم)' : ''}
        </div>
      )}

      {/* footer actions */}
      <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-gray-50 pt-2">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          {r.attachments.length > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{r.attachments.length}</span>}
        </div>
        <div className="flex items-center gap-0.5">
          <select
            value={r.stage}
            onChange={(e) => onMove(r.id, e.target.value as BrStage)}
            disabled={disabled}
            title="نقل إلى مرحلة"
            className="rounded-md border border-gray-200 bg-white px-1 py-0.5 text-[10px] text-gray-600 focus:outline-none"
          >
            {BR_STAGES.map((s) => <option key={s} value={s}>{BR_STAGE_LABELS[s]}</option>)}
          </select>
          <button onClick={onEdit} className="rounded-md p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50" title="تعديل"><Edit2 className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  )
}
