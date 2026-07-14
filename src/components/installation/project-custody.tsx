'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Wallet, Plus, Trash2, Upload, FileText, X, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { addCustodyEntry, deleteCustodyEntry } from '@/lib/actions/custody'
import { uploadFileDirect } from '@/lib/upload-client'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { CUSTODY_CATEGORIES, CUSTODY_CATEGORY_LABELS } from '@/lib/constants'
import type { CustodyEntry, CustodyKind } from '@/types/database'

function todaySA() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
}

/**
 * Custody is a side concern — not part of the installation flow. So it lives
 * behind a small chip in the section header; clicking it opens everything
 * (summary, entries, add form) in one focused dialog.
 */
export function ProjectCustody({
  projectId, entries, canEdit,
}: {
  projectId: string
  entries: CustodyEntry[]
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const [kind, setKind] = useState<CustodyKind>('expense')
  const [category, setCategory] = useState('materials')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [entryDate, setEntryDate] = useState(todaySA())
  const [recipient, setRecipient] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<{ url: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const advances = entries.filter((e) => e.kind === 'advance').reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const expenses = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const balance = advances - expenses

  function resetForm() {
    setKind('expense'); setCategory('materials'); setDescription(''); setAmount('')
    setEntryDate(todaySA()); setRecipient(''); setNotes(''); setFiles([])
  }

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!picked.length) return
    setUploading(true)
    const added: { url: string; name: string }[] = []
    for (const f of picked) {
      const up = await uploadFileDirect(f, `custody/${projectId}`)
      if ('error' in up) { toast.error(up.error); continue }
      added.push({ url: up.url, name: f.name })
    }
    setUploading(false)
    if (added.length) setFiles((prev) => [...prev, ...added])
  }

  function submit() {
    const amt = parseFloat(amount)
    if (!description.trim()) { toast.error('اكتب البيان'); return }
    if (isNaN(amt) || amt <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    startTransition(async () => {
      try {
        const r = await addCustodyEntry({
          projectId, kind, category, description, amount: amt,
          entryDate, recipient, notes, attachments: files,
        })
        if (r?.error) toast.error(r.error)
        else {
          toast.success(kind === 'advance' ? 'تم تسجيل العهدة' : 'تم تسجيل المصروف')
          resetForm(); setAdding(false)
        }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function remove(id: string) {
    if (!confirm('حذف هذا السجل؟')) return
    startTransition(async () => {
      try {
        const r = await deleteCustodyEntry(id, projectId)
        if (r?.error) toast.error(r.error)
        else toast.success('تم الحذف')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  return (
    <>
      {/* Small, quiet trigger — shows the one number that matters */}
      <button
        onClick={() => setOpen(true)}
        title="العهد المالية"
        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:border-emerald-300"
      >
        <Wallet className="h-3.5 w-3.5" />
        العهد المالية
        {entries.length > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${balance < 0 ? 'bg-red-100 text-red-700' : 'bg-white text-emerald-700'}`}>
            متبقي {formatCurrency(balance)}
          </span>
        )}
      </button>

      {/* Everything lives here */}
      <Dialog open={open} onClose={() => { setOpen(false); setAdding(false) }} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>العهد المالية</DialogTitle>
          <DialogClose onClose={() => { setOpen(false); setAdding(false) }} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                <p className="text-[11px] text-emerald-600 font-medium">إجمالي العهدة</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(advances)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                <p className="text-[11px] text-amber-600 font-medium">المصروف</p>
                <p className="text-sm font-bold text-amber-700 mt-0.5">{formatCurrency(expenses)}</p>
              </div>
              <div className={`rounded-xl px-3 py-2.5 text-center ${balance < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-[11px] font-medium ${balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>المتبقي</p>
                <p className={`text-sm font-bold mt-0.5 ${balance < 0 ? 'text-red-700' : 'text-gray-800'}`}>{formatCurrency(balance)}</p>
              </div>
            </div>

            {/* Add — inline, so no nested dialogs */}
            {canEdit && !adding && (
              <Button size="sm" variant="outline" onClick={() => { resetForm(); setAdding(true) }} className="w-full">
                <Plus className="h-4 w-4" /> إضافة سجل عهدة
              </Button>
            )}

            {canEdit && adding && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setKind('advance')}
                    className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${kind === 'advance' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/15' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    <ArrowDownCircle className="h-4 w-4 inline-block ms-1" /> استلام عهدة
                  </button>
                  <button type="button" onClick={() => setKind('expense')}
                    className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${kind === 'expense' ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/15' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    <ArrowUpCircle className="h-4 w-4 inline-block ms-1" /> صرف / مشتريات
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">البيان *</Label>
                  <Input className="h-9" value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder={kind === 'advance' ? 'عهدة نقدية لمدير التركيبات' : 'شراء مواسير من السوق / سكن الفنيين'} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">المبلغ (ريال) *</Label>
                    <Input className="h-9" type="number" min="0" step="0.01" dir="ltr" value={amount}
                      onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">التاريخ</Label>
                    <Input className="h-9" type="date" dir="ltr" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">البند</Label>
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CUSTODY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{kind === 'advance' ? 'المستلم' : 'الصارف / المورّد'}</Label>
                    <Input className="h-9" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="اسم الشخص أو الجهة" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">ملاحظات</Label>
                  <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" />
                </div>

                {/* Receipts */}
                <div className="space-y-1.5">
                  {files.length > 0 && (
                    <div className="space-y-1">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-1.5">
                          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="flex-1 truncate text-xs text-gray-700">{f.name}</span>
                          <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="text-gray-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
                    {uploading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} إرفاق فاتورة / إيصال
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={pickFiles} />
                </div>

                <div className="flex items-center gap-2 border-t border-gray-200 pt-2.5">
                  <Button size="sm" loading={isPending} onClick={submit}>حفظ</Button>
                  <Button size="sm" variant="outline" onClick={() => { setAdding(false); resetForm() }}>إلغاء</Button>
                </div>
              </div>
            )}

            {/* Entries */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {entries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">لا توجد سجلات عهدة بعد</p>
              ) : (
                entries.map((e) => {
                  const isAdvance = e.kind === 'advance'
                  return (
                    <div key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-2.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${isAdvance ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          {isAdvance
                            ? <ArrowDownCircle className="h-4 w-4 text-emerald-700" />
                            : <ArrowUpCircle className="h-4 w-4 text-amber-700" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{e.description}</p>
                            {e.category && (
                              <span className="text-[10px] rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5">
                                {CUSTODY_CATEGORY_LABELS[e.category] ?? e.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {e.entry_date ? formatDateShort(e.entry_date) : ''}
                            {e.recipient ? ` · ${e.recipient}` : ''}
                            {e.creator?.full_name ? ` · بواسطة ${e.creator.full_name}` : ''}
                          </p>
                          {e.notes && <p className="text-xs text-gray-400 italic mt-0.5">{e.notes}</p>}
                          {(e.attachments ?? []).length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {(e.attachments ?? []).map((f, i) => (
                                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-brand-700 hover:bg-brand-50">
                                  <FileText className="h-3 w-3" /> {f.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${isAdvance ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isAdvance ? '+' : '−'} {formatCurrency(Number(e.amount ?? 0))}
                        </span>
                        {canEdit && (
                          <button onClick={() => remove(e.id)} disabled={isPending}
                            className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setAdding(false) }}>إغلاق</Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
