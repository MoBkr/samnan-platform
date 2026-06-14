'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Package, Upload, FileText, CheckCircle2, Truck, Plus, Trash2, Save, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { saveDocumentRecord } from '@/lib/actions/attachments'
import { updateMaterialsStatus, updateMaterialsItems } from '@/lib/actions/materials'
import { createPayment } from '@/lib/actions/payments'
import { uploadFileDirect } from '@/lib/upload-client'
import type { Material, Document, MaterialItem, Payment } from '@/types/database'

interface MaterialsTabProps {
  material: Material | null
  attachments: Document[]
  projectId: string
  canManage: boolean
  payments: Payment[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' })
}

function DocRow({ doc }: { doc: Document }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
        <FileText className="h-4 w-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.description || 'ملف'}</p>
        <p className="text-xs text-gray-400">
          {doc.uploader?.full_name && `${doc.uploader.full_name} • `}{formatDate(doc.uploaded_at)}
        </p>
      </div>
      <a href={doc.url} target="_blank" rel="noopener noreferrer"
        className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700">
        عرض
      </a>
    </div>
  )
}

function ItemsTable({ items }: { items: MaterialItem[] }) {
  if (items.length === 0) return null
  const hasPrice = items.some(i => i.unit_price && i.unit_price > 0)
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <th className="px-4 py-2.5 text-start font-medium">#</th>
            <th className="px-4 py-2.5 text-start font-medium">الصنف</th>
            <th className="px-4 py-2.5 text-start font-medium">الكمية</th>
            <th className="px-4 py-2.5 text-start font-medium">الوحدة</th>
            <th className="px-4 py-2.5 text-start font-medium">ملاحظات</th>
            {hasPrice && <th className="px-4 py-2.5 text-start font-medium">سعر الوحدة</th>}
            {hasPrice && <th className="px-4 py-2.5 text-start font-medium">الإجمالي</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
              <td className="px-4 py-2.5 text-gray-700">{item.quantity}</td>
              <td className="px-4 py-2.5 text-gray-500">{item.unit}</td>
              <td className="px-4 py-2.5 text-gray-400 italic">{item.notes || '—'}</td>
              {hasPrice && (
                <td className="px-4 py-2.5 text-gray-700">
                  {item.unit_price ? `${item.unit_price.toLocaleString('en')} ر.س` : '—'}
                </td>
              )}
              {hasPrice && (
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {item.unit_price ? `${(item.quantity * item.unit_price).toLocaleString('en')} ر.س` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {hasPrice && (
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={hasPrice ? 5 : 5} className="px-4 py-2.5 text-sm font-bold text-gray-700">الإجمالي</td>
              <td className="px-4 py-2.5"></td>
              <td className="px-4 py-2.5 font-bold text-brand-700">
                {items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0).toLocaleString('en')} ر.س
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function MaterialsTab({ material, attachments, projectId, canManage, payments }: MaterialsTabProps) {
  const [isPending, startTransition] = useTransition()

  const requestDocs = attachments.filter((a) => a.type === 'materials_request')
  const deliveryDocs = attachments.filter((a) => a.type === 'delivery_note')

  const status = material?.status ?? 'pending'
  const items: MaterialItem[] = material?.items ?? []
  const isDelivered = status === 'delivered'
  const isReady = status === 'ready'

  // Only non-cancelled materials payments block the "create payment" button
  const materialsPayment = payments.find((p) => p.type === 'materials' && p.status !== 'cancelled')

  // Items editor state — draftItems is the single source of truth for display
  const [editingItems, setEditingItems] = useState(false)
  const [draftItems, setDraftItems] = useState<MaterialItem[]>(() => material?.items ?? [])
  const [newItem, setNewItem] = useState<MaterialItem>({ name: '', quantity: 0, unit: '', notes: '', unit_price: 0 })

  // Mark-ready dialog
  const [readyDialog, setReadyDialog] = useState(false)
  const [readyFile, setReadyFile] = useState<File | null>(null)
  const [uploadingReady, setUploadingReady] = useState(false)

  // Delivery note upload (post-delivery)
  const [deliveryNoteUploading, setDeliveryNoteUploading] = useState(false)

  // Create payment dialog
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')

  // draftItems is always the display source — no flicker after save
  const itemsTotal = draftItems.reduce((sum, item) => sum + (item.quantity * (item.unit_price ?? 0)), 0)

  function handleSaveItems() {
    startTransition(async () => {
      try {
        const result = await updateMaterialsItems(projectId, draftItems)
        if (result?.error) toast.error(result.error)
        else {
          toast.success('تم حفظ قائمة المواد')
          setEditingItems(false)
          // draftItems keeps its value — shown immediately without waiting for server revalidation
        }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleAddItem() {
    if (!newItem.name.trim() || !newItem.unit.trim() || newItem.quantity <= 0) {
      toast.error('يرجى إدخال اسم الصنف والكمية والوحدة')
      return
    }
    setDraftItems((prev) => [...prev, { ...newItem }])
    setNewItem({ name: '', quantity: 0, unit: '', notes: '', unit_price: 0 })
  }

  function handleRemoveItem(idx: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleRequestFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    startTransition(async () => {
      try {
        const upResult = await uploadFileDirect(file, 'materials_request')
        if ('error' in upResult) { toast.error(upResult.error); return }
        const result = await saveDocumentRecord(projectId, 'materials_request', upResult.url, file.name)
        if ('error' in result) toast.error(result.error)
        else toast.success('تم رفع الملف')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleMarkReady() {
    setReadyDialog(true)
    setReadyFile(null)
  }

  function handleConfirmReady() {
    setUploadingReady(true)
    startTransition(async () => {
      try {
        if (readyFile) {
          const upResult = await uploadFileDirect(readyFile, 'materials_request')
          if ('error' in upResult) { toast.error(upResult.error); setUploadingReady(false); return }
          const saveResult = await saveDocumentRecord(projectId, 'materials_request', upResult.url, `قائمة المواد الجاهزة — ${readyFile.name}`)
          if ('error' in saveResult) { toast.error(saveResult.error); setUploadingReady(false); return }
        }
        const result = await updateMaterialsStatus(projectId, 'ready')
        setUploadingReady(false)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم تحديد المواد كجاهزة'); setReadyDialog(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleConfirmDelivery() {
    startTransition(async () => {
      try {
        const result = await updateMaterialsStatus(projectId, 'delivered')
        if (result?.error) toast.error(result.error)
        else toast.success('تم تأكيد الاستلام')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDeliveryNoteUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setDeliveryNoteUploading(true)
    startTransition(async () => {
      try {
        const upResult = await uploadFileDirect(file, 'delivery_note')
        if ('error' in upResult) { setDeliveryNoteUploading(false); toast.error(upResult.error); return }
        const result = await saveDocumentRecord(projectId, 'delivery_note', upResult.url, file.name)
        setDeliveryNoteUploading(false)
        if ('error' in result) toast.error(result.error)
        else toast.success('تم رفع وصل الاستلام')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleCreatePayment() {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return }
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('project_id', projectId)
        formData.set('type', 'materials')
        formData.set('amount', amount.toString())
        const result = await createPayment(formData)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم إنشاء دفعة المواد في تاب الدفعات'); setPaymentDialog(false) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  const hasContent = requestDocs.length > 0 || items.length > 0

  // Delivery locked until at least partial payment received
  const isDeliveryLocked = !materialsPayment || materialsPayment.paid_amount === 0

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Package className="h-4 w-4 text-amber-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">المواد</h3>
          {material && <StatusChip status={status} />}
        </div>
      </div>

      {/* View-only notice for non-managers */}
      {!canManage && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <Package className="h-5 w-5 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-500">هذا القسم للعرض فقط — إدارة المواد متاحة للكوردنيتر والإدارة</p>
        </div>
      )}

      {/* Delivery lock notice — shown only in ready state without payment */}
      {isReady && isDeliveryLocked && canManage && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Package className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">في انتظار تسديد دفعة المواد</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {materialsPayment
                ? 'تم إنشاء الدفعة — المواد لن تُسلَّم حتى يسدد العميل ولو جزءاً منها'
                : 'أضف دفعة المواد للدفعات ثم سجّل استلامها للسماح بالتسليم'}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 1 — طلب المواد (always visible unless delivered)
      ══════════════════════════════════════════════ */}
      {!isDelivered && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-5 space-y-4">
          <StepLabel number={1} done={hasContent} label="طلب المواد" />

          {/* PDF upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ملفات الطلب</p>
              {canManage && !isReady && (
                <label className="cursor-pointer">
                  <UploadChip loading={isPending && !readyDialog} label="رفع ملف" />
                  <input type="file" accept=".pdf,image/*,application/pdf" className="hidden"
                    disabled={isPending} onChange={handleRequestFileUpload} />
                </label>
              )}
            </div>
            {requestDocs.map((d) => <DocRow key={d.id} doc={d} />)}
            {requestDocs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">لا توجد ملفات مرفوعة</p>
            )}
          </div>

          {/* Items list — always editable when canManage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">قائمة المواد يدوياً</p>
              {canManage && !editingItems && (
                <button onClick={() => setEditingItems(true)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  {draftItems.length > 0 ? 'تعديل' : 'إضافة مواد'}
                </button>
              )}
            </div>

            {editingItems ? (
              <div className="space-y-3 rounded-xl border border-brand-100 bg-white p-4">
                {/* Draft items table */}
                {draftItems.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                          <th className="px-3 py-2 text-start font-medium">الصنف</th>
                          <th className="px-3 py-2 text-start font-medium">الكمية</th>
                          <th className="px-3 py-2 text-start font-medium">الوحدة</th>
                          <th className="px-3 py-2 text-start font-medium">ملاحظات</th>
                          <th className="px-3 py-2 text-start font-medium">سعر الوحدة</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {draftItems.map((item, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                            <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                            <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                            <td className="px-3 py-2 text-gray-400 italic text-xs">{item.notes || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.unit_price ? `${item.unit_price.toLocaleString('en')} ر.س` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => handleRemoveItem(i)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* New item row */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <Label className="text-xs">اسم الصنف *</Label>
                    <Input placeholder="كابل نحاس..." value={newItem.name}
                      onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الكمية *</Label>
                    <Input type="number" min="0" step="0.01" placeholder="100"
                      value={newItem.quantity || ''}
                      onChange={(e) => setNewItem((p) => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الوحدة *</Label>
                    <Input placeholder="متر، قطعة..." value={newItem.unit}
                      onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ملاحظات</Label>
                    <Input placeholder="اختياري" value={newItem.notes ?? ''}
                      onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">سعر الوحدة (ريال)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0"
                      value={newItem.unit_price || ''}
                      onChange={(e) => setNewItem((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  إضافة صنف
                </Button>

                {/* Items total preview */}
                {draftItems.some(i => i.unit_price && i.unit_price > 0) && (
                  <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-brand-700">
                    إجمالي المواد: <strong>{draftItems.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0).toLocaleString('en')} ر.س</strong>
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <Button size="sm" loading={isPending} onClick={handleSaveItems} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    حفظ القائمة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingItems(false)}>إلغاء</Button>
                </div>
              </div>
            ) : (
              <ItemsTable items={draftItems} />
            )}

            {!editingItems && draftItems.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">لم تُدخَل مواد يدوياً</p>
            )}
          </div>

          {/* Create / view materials payment */}
          {canManage && draftItems.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 mt-1">
              <div className="flex items-center gap-2">
                {itemsTotal > 0 ? (
                  <span className="text-sm text-gray-700">
                    إجمالي المواد: <strong className="text-brand-700">{itemsTotal.toLocaleString('en')} ر.س</strong>
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">لم تُحدَّد أسعار للمواد</span>
                )}
              </div>
              {materialsPayment ? (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                  تم إنشاء الدفعة ✓
                </span>
              ) : (
                <Button size="sm" variant="outline"
                  onClick={() => { setPaymentAmount(itemsTotal > 0 ? itemsTotal.toString() : ''); setPaymentDialog(true) }}>
                  إضافة للدفعات
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — المواد جاهزة
      ══════════════════════════════════════════════ */}
      {(draftItems.length > 0 || requestDocs.length > 0) && !isReady && !isDelivered && canManage && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StepLabel number={2} done={false} label="المواد جاهزة للتوريد" />
          </div>
          <Button size="sm" onClick={handleMarkReady} className="shrink-0">
            تحديد كجاهزة
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — المواد جاهزة + الفاتورة + التوريد
      ══════════════════════════════════════════════ */}
      {isReady && (
        <div className="space-y-4">

          {/* ── Invoice card ── */}
          {draftItems.length > 0 && (
            <div className="rounded-2xl border border-brand-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
                    <FileText className="h-4 w-4 text-brand-700" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">فاتورة المواد</h4>
                </div>
                {materialsPayment ? (
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                    تم إنشاء الدفعة ✓
                  </span>
                ) : canManage ? (
                  <Button size="sm"
                    onClick={() => { setPaymentAmount(itemsTotal > 0 ? itemsTotal.toString() : ''); setPaymentDialog(true) }}>
                    إضافة للدفعات
                  </Button>
                ) : null}
              </div>

              <ItemsTable items={draftItems} />

              {itemsTotal > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
                  <span className="text-sm font-semibold text-brand-800">الإجمالي</span>
                  <span className="text-lg font-bold text-brand-700">{itemsTotal.toLocaleString('en')} ر.س</span>
                </div>
              )}
            </div>
          )}

          {/* ── Request docs ── */}
          {requestDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">مستندات الطلب</p>
              {requestDocs.map((d) => <DocRow key={d.id} doc={d} />)}
            </div>
          )}

          {/* ── Delivery action ── */}
          {canManage && (
            <div className="flex items-center justify-between rounded-xl border bg-white p-4 gap-3"
              style={{ borderColor: isDeliveryLocked ? '#fde68a' : '#bfdbfe' }}>
              <div>
                <p className="text-sm font-semibold text-gray-800">تأكيد استلام المواد</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isDeliveryLocked
                    ? 'مقفول — يجب تسديد ولو جزء من دفعة المواد أولاً'
                    : 'بعد التأكيد ارفع وصل الاستلام الموقّع من العميل'}
                </p>
              </div>
              <Button size="sm" loading={isPending}
                onClick={isDeliveryLocked ? undefined : handleConfirmDelivery}
                disabled={isDeliveryLocked}
                className={`shrink-0 ${isDeliveryLocked ? '' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                <Truck className="h-3.5 w-3.5" />
                {isDeliveryLocked ? 'مقفول' : 'استلمنا المواد'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 4 — مكتمل (status = delivered)
      ══════════════════════════════════════════════ */}
      {isDelivered && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">تم استلام المواد بنجاح</p>
              {material?.ready_at && (
                <p className="text-xs text-emerald-600 mt-0.5">بتاريخ: {formatDate(material.ready_at)}</p>
              )}
            </div>
          </div>

          {requestDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">مستندات الطلب</p>
              {requestDocs.map((d) => <DocRow key={d.id} doc={d} />)}
            </div>
          )}

          {draftItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">قائمة المواد</p>
              <ItemsTable items={draftItems} />
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">وصل الاستلام (موقّع من العميل)</p>
              {canManage && (
                <label className="cursor-pointer">
                  <UploadChip loading={deliveryNoteUploading} label="رفع الوصل" />
                  <input type="file" accept=".pdf,image/*,application/pdf" className="hidden"
                    disabled={isPending} onChange={handleDeliveryNoteUpload} />
                </label>
              )}
            </div>
            {deliveryDocs.length > 0
              ? deliveryDocs.map((d) => <DocRow key={d.id} doc={d} />)
              : <p className="text-xs text-gray-400 text-center py-2">لم يُرفع وصل الاستلام بعد</p>
            }
          </div>
        </div>
      )}

      {/* ── Mark Ready dialog ── */}
      <Dialog open={readyDialog} onClose={() => setReadyDialog(false)}>
        <DialogHeader>
          <DialogTitle>تحديد المواد كجاهزة</DialogTitle>
          <DialogClose onClose={() => setReadyDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              يمكنك إرفاق مستند قائمة المواد الجاهزة قبل التأكيد (اختياري).
            </p>
            <div className="space-y-1.5">
              <Label>قائمة المواد الجاهزة (اختياري)</Label>
              {readyFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <FileText className="h-5 w-5 text-brand-600 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">{readyFile.name}</span>
                  <button type="button" onClick={() => setReadyFile(null)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-5 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-500">اضغط لاختيار ملف</p>
                  <input type="file" accept=".pdf,image/*,application/pdf" className="hidden"
                    onChange={(e) => setReadyFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReadyDialog(false)}>إلغاء</Button>
          <Button loading={isPending || uploadingReady} onClick={handleConfirmReady}>
            <CheckCircle2 className="h-4 w-4" />
            تأكيد — المواد جاهزة
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Create Materials Payment dialog ── */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
        <DialogHeader>
          <DialogTitle>إنشاء دفعة مواد</DialogTitle>
          <DialogClose onClose={() => setPaymentDialog(false)} />

        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">سيتم إنشاء دفعة مواد في تاب الدفعات. يمكن تعديل المبلغ قبل الإنشاء.</p>
            {itemsTotal > 0 && (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-brand-700">
                إجمالي المواد المحسوب: <strong>{itemsTotal.toLocaleString('en')} ر.س</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="mat_payment_amount">مبلغ الدفعة (ريال)</Label>
              <Input id="mat_payment_amount" type="number" min="1" step="0.01"
                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPaymentDialog(false)}>إلغاء</Button>
          <Button loading={isPending} onClick={handleCreatePayment}>إنشاء الدفعة</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// ── Helper sub-components ──

function StepLabel({ number, done, label }: { number: number; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${done ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
        {done ? '✓' : number}
      </span>
      <p className="text-sm font-semibold text-gray-800">{label}</p>
    </div>
  )
}

function UploadChip({ loading, label }: { loading: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 transition-colors shadow-sm cursor-pointer">
      {loading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'قيد الانتظار', cls: 'bg-gray-100 text-gray-600' },
    preparing: { label: 'قيد التجهيز', cls: 'bg-amber-100 text-amber-700' },
    ready: { label: 'جاهزة للتسليم', cls: 'bg-blue-100 text-blue-700' },
    delivered: { label: 'تم الاستلام', cls: 'bg-emerald-100 text-emerald-700' },
    partial: { label: 'استلام جزئي', cls: 'bg-orange-100 text-orange-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}
