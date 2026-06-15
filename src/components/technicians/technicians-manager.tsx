'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Users, Plus, Search, History, Pencil, Phone, BadgeCheck, CircleSlash,
  CheckCircle2, Clock, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { addTechnician, updateTechnician, getTechnicianHistory } from '@/lib/actions/technicians'
import { formatDateShort } from '@/lib/utils'
import type { TechnicianWithStatus, TechnicianAssignment } from '@/types/database'

const STATUS_LABEL: Record<string, string> = { active: 'نشط', done: 'مكتمل', removed: 'أُزيل' }

export function TechniciansManager({ technicians, canManage }: { technicians: TechnicianWithStatus[]; canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTech, setEditTech] = useState<TechnicianWithStatus | null>(null)
  const [historyFor, setHistoryFor] = useState<TechnicianWithStatus | null>(null)
  const [isPending, startTransition] = useTransition()

  const busy = technicians.filter((t) => t.current)
  const free = technicians.filter((t) => t.is_active && !t.current)

  const filtered = technicians.filter((t) =>
    t.name.includes(search) || (t.employee_no ?? '').includes(search) || (t.phone ?? '').includes(search)
  )

  const [form, setForm] = useState({ name: '', employee_no: '', phone: '' })

  function submitAdd() {
    if (!form.name.trim()) { toast.error('يرجى إدخال اسم الفني'); return }
    startTransition(async () => {
      try {
        const result = await addTechnician(form)
        if (result?.error) toast.error(result.error)
        else { toast.success('تمت إضافة الفني'); setShowAdd(false); setForm({ name: '', employee_no: '', phone: '' }) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function submitEdit() {
    if (!editTech) return
    if (!form.name.trim()) { toast.error('يرجى إدخال اسم الفني'); return }
    startTransition(async () => {
      try {
        const result = await updateTechnician(editTech.id, form)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم التحديث'); setEditTech(null) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function toggleActive(t: TechnicianWithStatus) {
    if (t.current) { toast.error('لا يمكن إيقاف فني محجوز على مشروع'); return }
    startTransition(async () => {
      try {
        const result = await updateTechnician(t.id, { name: t.name, is_active: !t.is_active })
        if (result?.error) toast.error(result.error)
        else toast.success(t.is_active ? 'تم إيقاف الفني' : 'تم تفعيل الفني')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100">
            <Users className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">الفنيون</h1>
            <p className="text-xs text-gray-400">قائمة فنيي التركيب المشتركة</p>
          </div>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => { setForm({ name: '', employee_no: '', phone: '' }); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> إضافة فني
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={<Users className="h-5 w-5" />} bg="bg-gray-100 text-gray-700" value={technicians.length} label="إجمالي الفنيين" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} bg="bg-emerald-100 text-emerald-700" value={free.length} label="متاح" />
        <SummaryCard icon={<Clock className="h-5 w-5" />} bg="bg-amber-100 text-amber-700" value={busy.length} label="محجوز" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الرقم الوظيفي…" className="pr-10" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState message="لا يوجد فنيون" description={canManage ? 'اضغط إضافة فني للبدء' : ''} icon={<Users className="h-8 w-8 text-gray-400" />} />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${!t.is_active ? 'opacity-60' : ''} ${t.current ? 'border-amber-100' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0 ${t.current ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      {t.employee_no && <span className="text-[10px] rounded bg-gray-100 text-gray-500 px-1.5 py-0.5" dir="ltr">#{t.employee_no}</span>}
                      {!t.is_active && <span className="text-[10px] rounded bg-gray-200 text-gray-600 px-1.5 py-0.5">موقوف</span>}
                    </div>
                    {t.phone && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5" dir="ltr">
                        <Phone className="h-3 w-3" /> {t.phone}
                      </p>
                    )}
                    {t.current ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-medium">
                          <Clock className="h-3 w-3" /> محجوز
                        </span>
                        <span className="text-gray-500">
                          {formatDateShort(t.current.start_date)} — {formatDateShort(t.current.end_date)}
                        </span>
                        {t.current.project && (
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <MapPin className="h-3 w-3" /> {t.current.project.project_name}
                          </span>
                        )}
                      </div>
                    ) : t.is_active ? (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" /> متاح
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setHistoryFor(t)} title="السجل" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    <History className="h-4 w-4" />
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => { setForm({ name: t.name, employee_no: t.employee_no ?? '', phone: t.phone ?? '' }); setEditTech(t) }} title="تعديل" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleActive(t)} title={t.is_active ? 'إيقاف' : 'تفعيل'} disabled={isPending} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50">
                        {t.is_active ? <CircleSlash className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)}>
        <DialogHeader>
          <DialogTitle>إضافة فني</DialogTitle>
          <DialogClose onClose={() => setShowAdd(false)} />
        </DialogHeader>
        <DialogContent>
          <TechForm form={form} setForm={setForm} />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
          <Button loading={isPending} onClick={submitAdd}><Plus className="h-4 w-4" /> إضافة</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTech} onClose={() => setEditTech(null)}>
        <DialogHeader>
          <DialogTitle>تعديل بيانات الفني</DialogTitle>
          <DialogClose onClose={() => setEditTech(null)} />
        </DialogHeader>
        <DialogContent>
          <TechForm form={form} setForm={setForm} />
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditTech(null)}>إلغاء</Button>
          <Button loading={isPending} onClick={submitEdit}>حفظ</Button>
        </DialogFooter>
      </Dialog>

      {/* History dialog */}
      <HistoryDialog tech={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  )
}

function TechForm({ form, setForm }: { form: { name: string; employee_no: string; phone: string }; setForm: (f: { name: string; employee_no: string; phone: string }) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>اسم الفني *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم الكامل" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>الرقم الوظيفي</Label>
          <Input value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} placeholder="ID" dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label>رقم الجوال</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" />
        </div>
      </div>
    </div>
  )
}

function HistoryDialog({ tech, onClose }: { tech: TechnicianWithStatus | null; onClose: () => void }) {
  const [history, setHistory] = useState<(TechnicianAssignment & { project?: { id: string; project_name: string; client_name: string } })[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  if (tech && loadedFor !== tech.id && !loading) {
    setLoading(true)
    setLoadedFor(tech.id)
    getTechnicianHistory(tech.id).then((rows) => {
      setHistory(rows as never)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  return (
    <Dialog open={!!tech} onClose={() => { onClose(); setHistory(null); setLoadedFor(null) }}>
      <DialogHeader>
        <DialogTitle>سجل الفني {tech?.name ? `— ${tech.name}` : ''}</DialogTitle>
        <DialogClose onClose={() => { onClose(); setHistory(null); setLoadedFor(null) }} />
      </DialogHeader>
      <DialogContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            <Clock className="h-4 w-4 animate-spin me-2" /> جاري التحميل…
          </div>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">لا يوجد سجل تعيينات</p>
        ) : (
          <div className="space-y-2">
            {history.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{a.project?.project_name ?? 'مشروع'}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    a.status === 'active' ? 'bg-amber-100 text-amber-700' : a.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                  }`}>{STATUS_LABEL[a.status]}</span>
                </div>
                {a.project?.client_name && <p className="text-xs text-gray-400">{a.project.client_name}</p>}
                <p className="text-xs text-gray-500 mt-1">{formatDateShort(a.start_date)} — {formatDateShort(a.end_date)}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => { onClose(); setHistory(null); setLoadedFor(null) }}>إغلاق</Button>
      </DialogFooter>
    </Dialog>
  )
}

function SummaryCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
