'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Edit2, Calendar, AlertTriangle, Check, ChevronLeft,
  MapPin, User, Truck, Hash, Flag, Package, Paperclip, Upload, ArrowLeft, X, Search, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { uploadFileDirect } from '@/lib/upload-client'
import {
  createPurchaseRequest, updatePurchaseRequest, movePurchaseRequest,
  deletePurchaseRequest, addBrAttachment, removeBrAttachment, attachDocsToProjectByName,
} from '@/lib/actions/purchase-requests'
import { BR_STAGES, BR_STAGE_LABELS, BR_PRIORITY_LABELS } from '@/lib/constants'
import { formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PurchaseRequest, BrStage, BrMaterial, Profile } from '@/types/database'

const todaySA = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
const stageIdx = (s: BrStage) => BR_STAGES.indexOf(s)

interface Props {
  requests: PurchaseRequest[]
  users: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  projectNames: string[]
  myProjectNames?: string[]
  currentProfile: Profile
  // When embedded inside a project: only that project's requests, and new
  // requests are pinned to it. Same data as the main board — edits sync both.
  lockedProjectName?: string
  // View-only (e.g. the project's sales engineer): browse cards + details,
  // no create/edit/delete/stage actions.
  readOnly?: boolean
}

type BrForm = {
  br_number: string; release_number: string; project_name: string; supplier_name: string
  engineer_id: string; location: string; due_date: string; started_at: string
  priority: 'important' | 'medium'; status: 'not_started' | 'started'; progress: string; notes: string
  materials: BrMaterial[]; materialsDoc: { url: string; name: string } | null
  extraDocs: { url: string; name: string }[]
}
const EMPTY: BrForm = {
  br_number: '', release_number: '', project_name: '', supplier_name: '', engineer_id: '', location: '',
  due_date: '', started_at: '', priority: 'medium', status: 'not_started', progress: '0', notes: '', materials: [], materialsDoc: null,
  extraDocs: [],
}

export function PurchaseBoard({ requests, users, projectNames, myProjectNames = [], currentProfile, lockedProjectName, readOnly = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BrForm>({ ...EMPTY })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [filter, setFilter] = useState<BrStage | 'all' | 'overdue'>('all')
  const [search, setSearch] = useState('')
  const today = todaySA()

  // "مشاريعي" = requests I created, I'm the engineer on, or on a project I own.
  const myProjects = new Set(myProjectNames)
  const isMine = (r: PurchaseRequest) =>
    r.created_by === currentProfile.id ||
    r.engineer_id === currentProfile.id ||
    (!!r.project_name && myProjects.has(r.project_name))

  // Locked to one project (embedded) → only its requests; else honour the scope tab.
  const scoped = lockedProjectName
    ? requests.filter((r) => r.project_name === lockedProjectName)
    : requests.filter((r) => scope === 'all' || isMine(r))

  const detail = requests.find((r) => r.id === detailId) || null
  const q = search.trim().toLowerCase()
  const isLate = (r: PurchaseRequest) => r.stage !== 'completed' && !!r.due_date && r.due_date < today
  const shown = scoped.filter((r) => {
    if (filter === 'overdue') { if (!isLate(r)) return false }
    else if (filter !== 'all' && r.stage !== filter) return false
    if (q) {
      const hay = [r.br_number ?? '', r.release_number ?? '', r.project_name ?? '', r.supplier_name ?? ''].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    // Nearest expected-arrival date first; requests without a date go last.
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })
  const mineCount = requests.filter(isMine).length
  const overdueCount = scoped.filter((r) => r.stage !== 'completed' && r.due_date && r.due_date < today).length

  function openNew() { setEditingId(null); setForm({ ...EMPTY, project_name: lockedProjectName ?? '' }); setFormOpen(true) }
  function openEdit(r: PurchaseRequest) {
    setEditingId(r.id)
    setForm({
      br_number: r.br_number ?? '', release_number: r.release_number ?? '', project_name: r.project_name ?? '',
      supplier_name: r.supplier_name ?? '', engineer_id: r.engineer_id ?? '', location: r.location ?? '',
      due_date: r.due_date ?? '', started_at: r.started_at ?? '', priority: r.priority, status: r.status,
      progress: String(r.progress ?? 0), notes: r.notes ?? '', materials: r.materials ?? [], materialsDoc: null,
      extraDocs: [],
    })
    setFormOpen(true)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Project is optional now — a BR can exist without one ("بدون مشروع")
    const payload = {
      br_number: form.br_number, release_number: form.release_number, project_name: form.project_name,
      supplier_name: form.supplier_name, engineer_id: form.engineer_id || null, location: form.location,
      due_date: form.due_date || null, started_at: form.started_at || null, priority: form.priority,
      status: form.status, progress: parseInt(form.progress || '0', 10) || 0, notes: form.notes,
      materials: form.materials.filter((m) => m.name.trim()),
    }
    const createPayload = {
      ...payload,
      attachments: form.materialsDoc ? [{ ...form.materialsDoc, stage: 'create' as BrStage }] : [],
    }
    const extraDocs = form.extraDocs
    startTransition(async () => {
      try {
        const res = editingId ? await updatePurchaseRequest(editingId, payload) : await createPurchaseRequest(createPayload)
        if (res?.error) { toast.error(res.error); return }
        // Extra attachments → saved into the linked project's Attachments tab
        if (extraDocs.length) {
          const docRes = await attachDocsToProjectByName(form.project_name, extraDocs)
          if ('error' in docRes) toast.error(docRes.error)
          else if (docRes.found) toast.success(`تم حفظ ${docRes.attached} مرفق في مرفقات المشروع`)
          else toast.warning('تم حفظ الطلب — لكن لم يتم العثور على مشروع مطابق لحفظ المرفقات فيه')
        }
        toast.success(editingId ? 'تم تحديث الطلب' : 'تم إنشاء الطلب')
        setFormOpen(false)
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function advance(r: PurchaseRequest) {
    const cur = stageIdx(r.stage)
    // If a later stage already has a completion stamp, this stage was merely
    // reopened for a fix — one advance jumps straight back to where it was.
    const furthest = Math.max(cur, ...BR_STAGES.map((s, i) => (r.stage_history?.[s] ? i : -1)))
    const next = BR_STAGES[furthest > cur ? furthest : cur + 1]
    if (!next) return
    startTransition(async () => {
      try {
        const res = await movePurchaseRequest(r.id, next)
        if (res?.error) toast.error(res.error)
        else toast.success(furthest > cur
          ? `تم التعديل — رجع الطلب إلى: ${BR_STAGE_LABELS[next]}`
          : `اكتملت المرحلة — انتقل إلى: ${BR_STAGE_LABELS[next]}`)
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function moveTo(r: PurchaseRequest, stage: BrStage) {
    startTransition(async () => {
      try { const res = await movePurchaseRequest(r.id, stage); if (res?.error) toast.error(res.error) }
      catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('حذف طلب الشراء نهائياً؟')) return
    startTransition(async () => {
      try { const res = await deletePurchaseRequest(id); if (res?.error) toast.error(res.error); else { toast.success('تم الحذف'); setDetailId(null) } }
      catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span><span className="font-bold text-gray-800">{scoped.length}</span> طلب</span>
          {overdueCount > 0 && (
            <button onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}
              title="عرض المتأخر فقط"
              className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
                filter === 'overdue' ? 'bg-red-600 border-red-600 text-white' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100')}>
              <AlertTriangle className="h-3 w-3" /> {overdueCount} متأخر
            </button>
          )}
        </div>
        {!readOnly && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> طلب شراء جديد</Button>}
      </div>

      {/* Search by BR number / release (تعميد) number / project name */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم BR، رقم التعميد، اسم المشروع، أو المورّد..."
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 ps-10 pe-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scope: my requests vs. all (hidden when locked to a single project) */}
      {!lockedProjectName && (
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setScope('mine')}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${scope === 'mine' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            طلباتي <span className="text-xs opacity-70">({mineCount})</span>
          </button>
          <button
            onClick={() => setScope('all')}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${scope === 'all' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            كل الطلبات <span className="text-xs opacity-70">({requests.length})</span>
          </button>
        </div>
      )}

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="الكل" count={scoped.length} />
        {overdueCount > 0 && (
          <FilterChip active={filter === 'overdue'} onClick={() => setFilter('overdue')} label="متأخر" count={overdueCount} tone="red" />
        )}
        {BR_STAGES.map((s) => {
          const c = scoped.filter((r) => r.stage === s).length
          return <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={BR_STAGE_LABELS[s]} count={c} />
        })}
      </div>

      {/* Cards grid */}
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Package className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">لا توجد طلبات شراء</p>
          {!readOnly && <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openNew}><Plus className="h-3.5 w-3.5" /> أنشئ أول طلب</Button>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <RequestCard key={r.id} r={r} today={today} engineer={users.find((u) => u.id === r.engineer_id)} onOpen={() => setDetailId(r.id)} />
          ))}
        </div>
      )}

      {/* ── Detail modal ── */}
      <Dialog open={!!detail} onClose={() => setDetailId(null)} className="max-w-3xl">
        {detail && (
          <>
            <DialogHeader>
              <div className="min-w-0">
                <DialogTitle>{detail.project_name || 'طلب شراء — بدون مشروع'}</DialogTitle>
                <p className="mt-0.5 text-xs text-gray-500">
                  {detail.br_number ? `BR: ${detail.br_number}` : 'بدون رقم BR'}
                  {detail.release_number ? ` · تعميد: ${detail.release_number}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!readOnly && (
                  <>
                    <button onClick={() => openEdit(detail)} className="rounded-lg p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50" title="تعديل"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(detail.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50" title="حذف"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
                <DialogClose onClose={() => setDetailId(null)} />
              </div>
            </DialogHeader>
            <DialogContent className="max-h-[68vh] overflow-y-auto">
              {/* Info chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Chip on={detail.priority === 'important'} icon={<Flag className="h-3.5 w-3.5" />} text={`الأولوية: ${BR_PRIORITY_LABELS[detail.priority]}`} tone={detail.priority === 'important' ? 'red' : 'gray'} />
                {detail.supplier_name && <Chip icon={<Truck className="h-3.5 w-3.5" />} text={detail.supplier_name} />}
                {detail.engineer && <Chip icon={<User className="h-3.5 w-3.5" />} text={detail.engineer.full_name} />}
                {detail.location && <Chip icon={<MapPin className="h-3.5 w-3.5" />} text={detail.location} />}
                {detail.due_date && (
                  <Chip icon={<Calendar className="h-3.5 w-3.5" />} text={`الاستحقاق: ${formatDateShort(detail.due_date)}`}
                    tone={detail.stage !== 'completed' && detail.due_date < today ? 'red' : 'date'} />
                )}
              </div>

              {/* Materials table */}
              <div className="mb-5">
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-800"><Package className="h-4 w-4 text-gray-400" /> المواد المطلوب شراؤها</h4>
                {detail.materials && detail.materials.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                        <th className="px-3 py-2 text-start font-medium">#</th>
                        <th className="px-3 py-2 text-start font-medium">الصنف</th>
                        <th className="px-3 py-2 text-start font-medium">الكمية</th>
                        <th className="px-3 py-2 text-start font-medium">الوحدة</th>
                        <th className="px-3 py-2 text-start font-medium">ملاحظات</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {detail.materials.map((m, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{m.name}</td>
                            <td className="px-3 py-2 text-gray-600">{m.quantity ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{m.unit || '—'}</td>
                            <td className="px-3 py-2 text-gray-400 italic">{m.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-3 text-center text-xs text-gray-400">لم تُضف مواد — استخدم «تعديل» لإضافتها</p>
                )}
              </div>

              {/* Stepper */}
              <h4 className="mb-3 text-sm font-bold text-gray-800">مراحل الطلب</h4>
              <Stepper r={detail} isPending={isPending} onAdvance={() => advance(detail)} onMoveTo={(s) => moveTo(detail, s)} readOnly={readOnly} />
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ── Create / Edit form ── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingId ? 'تعديل طلب الشراء' : 'طلب شراء جديد'}</DialogTitle>
          <DialogClose onClose={() => setFormOpen(false)} />
        </DialogHeader>
        <DialogContent className="max-h-[64vh] overflow-y-auto">
          <form id="br-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>المشروع</Label>
              {lockedProjectName ? (
                <Input value={form.project_name} readOnly className="bg-gray-50 text-gray-500" />
              ) : (
                /* Picked from a searchable panel — typing the name by hand caused
                   mismatches that kept the BR from showing inside its project */
                <ProjectPicker
                  value={form.project_name}
                  onChange={(v) => setForm((f) => ({ ...f, project_name: v }))}
                  mine={myProjectNames}
                  all={projectNames}
                  initialScope={scope === 'mine' ? 'mine' : 'all'}
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رقم BR"><Input dir="ltr" className="text-start" value={form.br_number} onChange={(e) => setForm((f) => ({ ...f, br_number: e.target.value }))} /></Field>
              <Field label="رقم التعميد"><Input dir="ltr" className="text-start" value={form.release_number} onChange={(e) => setForm((f) => ({ ...f, release_number: e.target.value }))} /></Field>
              <Field label="اسم المورّد"><Input value={form.supplier_name} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} /></Field>
              <Field label="المهندس المسؤول">
                <Select value={form.engineer_id} onChange={(e) => setForm((f) => ({ ...f, engineer_id: e.target.value }))} placeholder="اختر">
                  <option value="">— بدون —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </Select>
              </Field>
              <Field label="الموقع"><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></Field>
              <Field label="الأولوية">
                <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as 'important' | 'medium' }))}>
                  <option value="medium">متوسط</option><option value="important">مهم</option>
                </Select>
              </Field>
              <Field label="تاريخ بدء الطلب"><Input type="date" dir="ltr" value={form.started_at} onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))} /></Field>
              <Field label="تاريخ الاستحقاق (الوصول المتوقع)"><Input type="date" dir="ltr" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} /></Field>
            </div>

            {/* Materials editor (manual table OR attach a file) */}
            <MaterialsEditor
              materials={form.materials}
              onChange={(m) => setForm((f) => ({ ...f, materials: m }))}
              allowDoc={!editingId}
              materialsDoc={form.materialsDoc}
              onDoc={(d) => setForm((f) => ({ ...f, materialsDoc: d }))}
            />

            {/* Extra attachments → saved into the linked project's Attachments tab */}
            <ProjectDocsUploader docs={form.extraDocs} onChange={(d) => setForm((f) => ({ ...f, extraDocs: d }))} />

            <Field label="ملاحظات"><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="اختياري" /></Field>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button type="submit" form="br-form" loading={isPending}>{editingId ? 'حفظ' : 'إنشاء الطلب'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

/* ── Stepper with per-stage attachments + advance ── */
function Stepper({ r, isPending, onAdvance, onMoveTo, readOnly = false }: {
  r: PurchaseRequest
  isPending: boolean
  onAdvance: () => void
  onMoveTo: (s: BrStage) => void
  readOnly?: boolean
}) {
  const [isPendingLocal, startLocal] = useTransition()
  const current = stageIdx(r.stage)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadStage, setUploadStage] = useState<BrStage | null>(null)
  const [uploading, setUploading] = useState(false)

  function triggerUpload(stage: BrStage) { setUploadStage(stage); setTimeout(() => fileRef.current?.click(), 0) }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''
    if (!files.length || !uploadStage) return
    setUploading(true)
    startLocal(async () => {
      try {
        for (const f of files) {
          const up = await uploadFileDirect(f, 'purchase')
          if ('error' in up) { toast.error(up.error); continue }
          await addBrAttachment(r.id, { url: up.url, name: f.name, stage: uploadStage })
        }
        toast.success('تم رفع المرفق')
      } catch { toast.error('تعذّر رفع المرفق') } finally { setUploading(false); setUploadStage(null) }
    })
  }
  function removeAtt(url: string) {
    startLocal(async () => { await removeBrAttachment(r.id, url) })
  }

  return (
    <div className="space-y-0">
      <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.dwg,.dxf" className="hidden" onChange={onFile} />
      {BR_STAGES.map((stage, idx) => {
        const when = r.stage_history?.[stage]
        // A stamped stage after the current one = the request was reopened at
        // an earlier stage for a fix; later stages stay green as completed.
        const done = idx !== current && (idx < current || !!when)
        const isCurrent = idx === current
        const atts = (r.attachments ?? []).filter((a) => a.stage === stage)
        const isLast = idx === BR_STAGES.length - 1
        return (
          <div key={stage} className="flex gap-3">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold border-2',
                done ? 'bg-emerald-500 border-emerald-500 text-white'
                  : isCurrent ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-gray-200 text-gray-400')}>
                {done ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              {!isLast && <div className={cn('w-0.5 flex-1 my-1', done ? 'bg-emerald-400' : 'bg-gray-200')} style={{ minHeight: 18 }} />}
            </div>

            {/* Content */}
            <div className={cn('flex-1 pb-5', isCurrent && 'pb-4')}>
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-sm font-bold', done ? 'text-emerald-700' : isCurrent ? 'text-brand-700' : 'text-gray-400')}>
                  {BR_STAGE_LABELS[stage]}
                </p>
                <div className="flex items-center gap-2">
                  {when && <span className="text-[11px] font-bold text-brand-800" dir="ltr">{formatDateShort(when)}</span>}
                  {/* Reopen a completed stage to fix a mistake — same as materials/installation */}
                  {done && !readOnly && (
                    <button
                      onClick={() => {
                        if (confirm(`إعادة فتح مرحلة «${BR_STAGE_LABELS[stage]}» للتعديل؟ المراحل التالية تبقى كما هي.`)) onMoveTo(stage)
                      }}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      title="إعادة فتح هذه المرحلة"
                    >
                      <RotateCcw className="h-3 w-3" /> إعادة فتح
                    </button>
                  )}
                </div>
              </div>

              {/* Logistics: surface expected delivery date */}
              {stage === 'logistics' && (done || isCurrent) && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-1 text-xs text-purple-700">
                  <Calendar className="h-3.5 w-3.5" />
                  موعد التسليم المتوقع: <span className="font-bold text-brand-800" dir="ltr">{r.due_date ? formatDateShort(r.due_date) : 'غير محدد'}</span>
                </div>
              )}

              {/* attachments for done/current stages */}
              {(done || isCurrent) && (
                <div className="mt-2 space-y-1.5">
                  {atts.map((a) => (
                    <div key={a.url} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-1.5 text-xs">
                      <Paperclip className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate text-gray-700">{a.name}</span>
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline shrink-0">عرض</a>
                      {!readOnly && <button onClick={() => removeAtt(a.url)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>}
                    </div>
                  ))}
                  {!readOnly && (
                    <button onClick={() => triggerUpload(stage)} disabled={uploading || isPendingLocal}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
                      <Upload className="h-3 w-3" /> إرفاق مستند لهذه المرحلة
                    </button>
                  )}
                </div>
              )}

              {/* advance button on current stage — after a reopen it returns
                  the request to the furthest completed stage in one click */}
              {isCurrent && !isLast && !readOnly && (
                <Button size="sm" className="mt-2.5 gap-1.5" loading={isPending} onClick={onAdvance}>
                  <Check className="h-3.5 w-3.5" />
                  {BR_STAGES.some((s, i) => i > current && r.stage_history?.[s])
                    ? 'تم التعديل — رجوع لآخر مرحلة'
                    : 'تمت هذه المرحلة — انتقل للتالية'}
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              )}
              {isCurrent && isLast && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> الطلب مكتمل
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Materials editor (manual table OR attach a file) ── */
function MaterialsEditor({ materials, onChange, allowDoc, materialsDoc, onDoc }: {
  materials: BrMaterial[]; onChange: (m: BrMaterial[]) => void
  allowDoc?: boolean; materialsDoc?: { url: string; name: string } | null; onDoc?: (d: { url: string; name: string } | null) => void
}) {
  const [row, setRow] = useState<BrMaterial>({ name: '', quantity: undefined, unit: '', notes: '' })
  const [docUploading, setDocUploading] = useState(false)
  const docRef = useRef<HTMLInputElement>(null)
  function add() {
    if (!row.name.trim()) { toast.error('اكتب اسم الصنف'); return }
    onChange([...materials, { ...row, name: row.name.trim() }])
    setRow({ name: '', quantity: undefined, unit: '', notes: '' })
  }
  async function onDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f || !onDoc) return
    setDocUploading(true)
    const up = await uploadFileDirect(f, 'purchase')
    setDocUploading(false)
    if ('error' in up) { toast.error(up.error); return }
    onDoc({ url: up.url, name: f.name }); toast.success('تم إرفاق قائمة المواد')
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Package className="h-3.5 w-3.5" /> المواد المطلوب شراؤها</p>

      {/* Option: attach as a file (PDF/image) */}
      {allowDoc && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-2.5">
          {materialsDoc ? (
            <div className="flex items-center gap-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-brand-600 shrink-0" />
              <span className="flex-1 truncate text-gray-700">{materialsDoc.name}</span>
              <button type="button" onClick={() => onDoc?.(null)} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => docRef.current?.click()} disabled={docUploading}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> {docUploading ? 'جاري الرفع...' : 'إرفاق قائمة المواد كملف (PDF / صورة) بدل الكتابة'}
            </button>
          )}
          <input ref={docRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.dwg,.dxf" className="hidden" onChange={onDocFile} />
        </div>
      )}
      {allowDoc && <p className="text-center text-[11px] text-gray-400">— أو أدخلها يدوياً —</p>}
      {materials.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {materials.map((m, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 font-medium text-gray-900">{m.name}</td>
                  <td className="px-3 py-1.5 text-gray-600">{m.quantity ?? '—'} {m.unit}</td>
                  <td className="px-3 py-1.5 text-gray-400 italic text-xs">{m.notes}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => onChange(materials.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input placeholder="الصنف *" value={row.name} onChange={(e) => setRow((r) => ({ ...r, name: e.target.value }))} />
        <Input type="number" placeholder="الكمية" value={row.quantity ?? ''} onChange={(e) => setRow((r) => ({ ...r, quantity: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <Input placeholder="الوحدة" value={row.unit} onChange={(e) => setRow((r) => ({ ...r, unit: e.target.value }))} />
        <Input placeholder="ملاحظات" value={row.notes} onChange={(e) => setRow((r) => ({ ...r, notes: e.target.value }))} />
      </div>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={add}><Plus className="h-3.5 w-3.5" /> إضافة صنف</Button>
    </div>
  )
}

/* ── Small bits ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
}

function ProjectDocsUploader({ docs, onChange }: { docs: { url: string; name: string }[]; onChange: (d: { url: string; name: string }[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    const added: { url: string; name: string }[] = []
    for (const file of files) {
      const up = await uploadFileDirect(file, 'project-docs')
      if ('error' in up) { toast.error(up.error); continue }
      added.push({ url: up.url, name: file.name })
    }
    setUploading(false)
    if (added.length) onChange([...docs, ...added])
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/40 p-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs"><Paperclip className="h-3.5 w-3.5" /> مرفقات إضافية (تُحفظ في مرفقات المشروع)</Label>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50">
          {uploading ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Upload className="h-3.5 w-3.5" />} رفع ملفات
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.dwg,.dxf" className="hidden" onChange={onFiles} />
      </div>
      {docs.length > 0 ? (
        <div className="space-y-1">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-1.5">
              <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-xs text-gray-700">{d.name}</span>
              <button type="button" onClick={() => onChange(docs.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">اختياري — أي مستندات إضافية للمشروع المرتبط بالطلب.</p>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label, count, tone = 'brand' }: {
  active: boolean; onClick: () => void; label: string; count: number; tone?: 'brand' | 'red'
}) {
  return (
    <button onClick={onClick} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-all',
      active
        ? tone === 'red' ? 'bg-red-600 border-red-600 text-white' : 'bg-brand-600 border-brand-600 text-white'
        : tone === 'red'
          ? 'bg-red-50 border-red-200 text-red-600 hover:border-red-300'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
      {label} <span className={cn('ms-1 rounded-full px-1 text-[10px] font-bold', active ? 'text-white/80' : tone === 'red' ? 'text-red-500' : 'text-gray-400')}>{count}</span>
    </button>
  )
}

function Chip({ icon, text, tone = 'gray', on }: { icon: React.ReactNode; text: string; tone?: 'gray' | 'red' | 'date'; on?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
      tone === 'red' ? 'bg-red-50 border-red-100 text-red-700 font-bold'
        : tone === 'date' ? 'bg-brand-50 border-brand-100 text-brand-800 font-bold'
        : on ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-50 border-gray-100 text-gray-600')}>
      <span className={tone === 'date' ? 'text-brand-500' : 'text-gray-400'}>{icon}</span>{text}
    </span>
  )
}

function RequestCard({ r, today, engineer, onOpen }: {
  r: PurchaseRequest; today: string; engineer?: Pick<Profile, 'id' | 'full_name' | 'role'>; onOpen: () => void
}) {
  const overdue = r.stage !== 'completed' && r.due_date && r.due_date < today
  const idx = stageIdx(r.stage)
  return (
    <button onClick={onOpen} className={cn('group block w-full text-start rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
      overdue ? 'border-red-200' : 'border-gray-100 hover:border-brand-200')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{r.project_name || <span className="text-gray-400">بدون مشروع</span>}</p>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', r.priority === 'important' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}>
          {BR_PRIORITY_LABELS[r.priority]}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs text-gray-500">
        {r.br_number && <p className="flex items-center gap-1.5"><Hash className="h-3 w-3 shrink-0" /> BR: <span dir="ltr" className="font-medium text-gray-700">{r.br_number}</span></p>}
        {r.release_number && <p className="flex items-center gap-1.5"><Flag className="h-3 w-3 shrink-0" /> PO (تعميد): <span dir="ltr" className="font-medium text-gray-700">{r.release_number}</span></p>}
        {r.supplier_name && <p className="flex items-center gap-1.5"><Truck className="h-3 w-3 shrink-0" /> {r.supplier_name}</p>}
        {engineer && <p className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" /> {engineer.full_name}</p>}
      </div>

      {/* stage indicator */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-semibold text-brand-700">{BR_STAGE_LABELS[r.stage]}</span>
          <span className="text-gray-400">{idx + 1}/{BR_STAGES.length}</span>
        </div>
        <div className="flex gap-1">
          {BR_STAGES.map((s, i) => (
            <div key={s} className={cn('h-1.5 flex-1 rounded-full', i < idx ? 'bg-emerald-400' : i === idx ? 'bg-brand-500' : 'bg-gray-150 bg-gray-100')} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2.5 text-[11px] text-gray-400">
        <div className="flex items-center gap-2">
          {r.materials?.length > 0 && <span className="inline-flex items-center gap-0.5"><Package className="h-3 w-3" />{r.materials.length}</span>}
          {r.attachments?.length > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{r.attachments.length}</span>}
          {r.due_date && (
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold', overdue ? 'text-red-600' : 'text-brand-800')}>
              <Calendar className="h-3.5 w-3.5" />{formatDateShort(r.due_date)}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-0.5 font-semibold text-brand-600 group-hover:gap-1.5 transition-all">التفاصيل <ChevronLeft className="h-3.5 w-3.5" /></span>
      </div>
    </button>
  )
}

/* ── Project picker — a button that opens a searchable, scope-aware panel.
   Chosen over a long <select>: 30+ projects need search + clear scoping. ── */
function ProjectPicker({
  value, onChange, mine, all, initialScope,
}: {
  value: string
  onChange: (v: string) => void
  mine: string[]
  all: string[]
  initialScope: 'mine' | 'all'
}) {
  const [open, setOpen] = useState(false)
  // Default to "my projects" only when the user actually has some
  const [tab, setTab] = useState<'mine' | 'all'>(initialScope === 'mine' && mine.length > 0 ? 'mine' : 'all')
  const [q, setQ] = useState('')

  const source = tab === 'mine' ? mine : all
  const filtered = source.filter((n) => !q.trim() || n.includes(q.trim()))
  const isLegacy = !!value && !all.includes(value)

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setQ('')
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm shadow-sm transition-all duration-200 ease-out hover:border-brand-300',
          open ? 'border-brand-400 ring-4 ring-brand-500/10' : 'border-gray-200',
        )}
      >
        <span className={cn('truncate', value ? 'font-semibold text-gray-900' : 'text-gray-400')}>
          {value || 'بدون مشروع — اضغط للاختيار'}
          {isLegacy && <span className="ms-1.5 text-[10px] font-normal text-amber-600">(اسم غير مطابق)</span>}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); pick('') }}
              className="rounded-full p-0.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 transition-colors"
              title="إزالة المشروع"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronLeft className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', open && '-rotate-90')} />
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-scale-in origin-top">
          {/* Scope tabs */}
          <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50/60 p-1.5">
            <button type="button" onClick={() => setTab('mine')}
              className={cn('flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === 'mine' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              مشاريعي ({mine.length})
            </button>
            <button type="button" onClick={() => setTab('all')}
              className={cn('flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === 'all' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              كل المشاريع ({all.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative border-b border-gray-100 p-2">
            <Search className="pointer-events-none absolute end-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم المشروع…"
              autoFocus
              className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pe-8 ps-3 text-xs outline-none transition-colors focus:border-brand-400 focus:bg-white"
            />
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto p-1.5">
            <button type="button" onClick={() => pick('')}
              className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                !value ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-500 hover:bg-gray-50')}>
              بدون مشروع
              {!value && <Check className="h-4 w-4" />}
            </button>
            {isLegacy && (
              <button type="button" onClick={() => pick(value)}
                className="flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                {value} <span className="text-[10px] font-normal">(اسم غير مطابق)</span>
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400">
                {tab === 'mine' && mine.length === 0 ? 'لا توجد مشاريع معيّنة لك — جرّب «كل المشاريع»' : 'لا توجد نتائج'}
              </p>
            ) : filtered.map((n) => (
              <button key={n} type="button" onClick={() => pick(n)}
                className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                  value === n ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-700 hover:bg-gray-50')}>
                <span className="truncate">{n}</span>
                {value === n && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
