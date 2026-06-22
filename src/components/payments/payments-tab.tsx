'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, CreditCard, Receipt, Upload, X, FileText, ImageIcon, Trash2, Edit2, Paperclip, ExternalLink, Copy, Check, Send, CircleCheck, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { PaymentStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { createPayment, recordPayment, deletePayment, editPayment, setSalesConfirmation } from '@/lib/actions/payments'
import { savePaymentAttachment, deleteAttachment, deletePaymentReceipt } from '@/lib/actions/attachments'
import { uploadFileDirect } from '@/lib/upload-client'
import { formatCurrency, formatDateShort, isOverdue } from '@/lib/utils'
import { PAYMENT_TYPE_LABELS } from '@/lib/constants'
import type { Payment, Profile, Document } from '@/types/database'

const PAYMENT_TYPES = ['upfront', 'materials', 'installation', 'final', 'custom'] as const

function paymentLabel(p: Payment) {
  return p.type === 'custom' ? (p.name || 'دفعة أخرى') : PAYMENT_TYPE_LABELS[p.type]
}

interface PaymentsTabProps {
  payments: Payment[]
  projectId: string
  canManage: boolean
  currentProfile?: Profile
  projectTotal?: number | null
  attachments?: Document[]
  canConfirmSales?: boolean
  hasInstallation?: boolean
}

export function PaymentsTab({ payments, projectId, canManage, projectTotal, attachments = [], canConfirmSales = false, hasInstallation = true }: PaymentsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState('')
  const [inv, setInv] = useState({ invoice_number: '', invoice_date: '', seller_name: '', customer_account: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [recordPaymentId, setRecordPaymentId] = useState<string | null>(null)
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null)
  const [attachmentsPaymentId, setAttachmentsPaymentId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [primaryFile, setPrimaryFile] = useState<File | null>(null)   // المرفق الأساسي للدفعة
  const [otherFiles, setOtherFiles] = useState<File[]>([])            // مرفقات أخرى
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)

  const selectedPayment = payments.find((p) => p.id === recordPaymentId)
  const editingPayment = payments.find((p) => p.id === editPaymentId)
  const attachmentsPayment = payments.find((p) => p.id === attachmentsPaymentId)

  const usedTypes = new Set(
    payments.filter((p) => p.status !== 'cancelled' && p.type !== 'custom').map((p) => p.type)
  )
  const paidTypes = new Set(payments.filter((p) => p.status === 'paid').map((p) => p.type))

  function attachmentsFor(paymentId: string) {
    return attachments.filter((a) => a.payment_id === paymentId)
  }

  function openAddDialog() {
    setAddType('')
    setInv({ invoice_number: '', invoice_date: '', seller_name: '', customer_account: '' })
    setPrimaryFile(null)
    setOtherFiles([])
    setShowAddDialog(true)
  }

  function closeAddDialog() {
    setShowAddDialog(false)
    setAddType('')
    setInv({ invoice_number: '', invoice_date: '', seller_name: '', customer_account: '' })
  }

  function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const type = formData.get('type') as string
    if (type !== 'custom' && usedTypes.has(type as never)) {
      toast.error('يوجد دفعة من هذا النوع. احذف أو الغِ الدفعة الموجودة أولاً')
      return
    }
    formData.set('project_id', projectId)
    startTransition(async () => {
      try {
        const result = await createPayment(formData)
        if (result?.error) { toast.error(result.error); return }
        // Upload attachments staged during creation → link to the new payment
        const newId = result?.paymentId
        if (newId && (primaryFile || otherFiles.length > 0)) {
          const typeLabel = type === 'custom'
            ? ((formData.get('name') as string)?.trim() || 'الدفعة')
            : (PAYMENT_TYPE_LABELS[type as keyof typeof PAYMENT_TYPE_LABELS] ?? 'الدفعة')
          let ok = 0
          const jobs: { file: File; desc: string }[] = []
          if (primaryFile) jobs.push({ file: primaryFile, desc: `مرفق ${typeLabel}` })
          for (const f of otherFiles) jobs.push({ file: f, desc: f.name })
          for (const job of jobs) {
            const up = await uploadFileDirect(job.file, 'receipts')
            if ('error' in up) { toast.error(up.error); continue }
            const res = await savePaymentAttachment(projectId, newId, 'receipt', up.url, job.desc)
            if ('error' in res) toast.error(res.error)
            else ok++
          }
          toast.success(ok > 0 ? `تم إضافة الدفعة و ${ok} مرفق` : 'تم إضافة الدفعة')
        } else {
          toast.success('تم إضافة الدفعة بنجاح')
        }
        closeAddDialog()
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleSalesToggle(paymentId: string, field: 'sales_invoice_sent' | 'sales_payment_confirmed', value: boolean) {
    startTransition(async () => {
      try {
        const res = await setSalesConfirmation(paymentId, projectId, field, value)
        if (res?.error) toast.error(res.error)
        else toast.success('تم تحديث التأكيد')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  async function copyInvoiceNumber(id: string, num: string) {
    try {
      await navigator.clipboard.writeText(num)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { toast.error('تعذّر النسخ') }
  }

  function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    startTransition(async () => {
      try {
        let receiptUrl = (form.elements.namedItem('receipt_url') as HTMLInputElement)?.value || ''
        if (receiptFile) {
          const uploadResult = await uploadFileDirect(receiptFile, 'receipts')
          if ('error' in uploadResult) { toast.error(uploadResult.error); return }
          receiptUrl = uploadResult.url
        }
        const formData = new FormData(form)
        formData.set('payment_id', recordPaymentId!)
        formData.set('project_id', projectId)
        formData.set('receipt_url', receiptUrl)
        const result = await recordPayment(formData)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم تسجيل الدفعة بنجاح'); setRecordPaymentId(null); setReceiptFile(null) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleEditPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('payment_id', editPaymentId!)
    formData.set('project_id', projectId)
    startTransition(async () => {
      try {
        const result = await editPayment(formData)
        if (result?.error) toast.error(result.error)
        else { toast.success('تم تعديل الدفعة'); setEditPaymentId(null) }
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDeletePayment(payment: Payment) {
    const warningText = payment.status === 'paid'
      ? `تحذير: هذه الدفعة مؤكدة ومدفوعة بالكامل. هل أنت متأكد من حذف دفعة "${paymentLabel(payment)}"؟`
      : `هل تريد حذف دفعة "${paymentLabel(payment)}"؟`
    if (!confirm(warningText)) return
    startTransition(async () => {
      try {
        const result = await deletePayment(payment.id, projectId)
        if (result?.error) toast.error(result.error)
        else toast.success('تم حذف الدفعة')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || !attachmentsPaymentId) return
    setUploadingAttachment(true)
    startTransition(async () => {
      try {
        let ok = 0
        let lastError = ''
        for (const file of files) {
          const up = await uploadFileDirect(file, 'receipts')
          if ('error' in up) { lastError = up.error; continue }
          const res = await savePaymentAttachment(projectId, attachmentsPaymentId, 'receipt', up.url, file.name)
          if ('error' in res) lastError = res.error
          else ok++
        }
        if (ok > 0) toast.success(ok === 1 ? 'تم رفع المرفق' : `تم رفع ${ok} مرفقات`)
        if (lastError) toast.error(lastError)
      } catch { toast.error('حدث خطأ غير متوقع') }
      finally { setUploadingAttachment(false) }
    })
  }

  function handleDeleteAttachment(docId: string) {
    if (!confirm('حذف هذا المرفق؟')) return
    startTransition(async () => {
      try {
        const res = await deleteAttachment(docId, projectId)
        if (res?.error) toast.error(res.error)
        else toast.success('تم حذف المرفق')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleDeleteReceipt(paymentId: string) {
    if (!confirm('حذف الإيصال الأساسي؟')) return
    startTransition(async () => {
      try {
        const res = await deletePaymentReceipt(paymentId, projectId)
        if (res?.error) toast.error(res.error)
        else toast.success('تم حذف الإيصال')
      } catch { toast.error('حدث خطأ غير متوقع') }
    })
  }

  function handleRecordClose() { setRecordPaymentId(null); setReceiptFile(null) }

  const activePayments = payments.filter((p) => p.status !== 'cancelled')
  const totalAmount = activePayments.reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalPaid = activePayments.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  // Collection % = how much of the PROJECT VALUE has been collected
  const baseValue = projectTotal != null && projectTotal > 0 ? projectTotal : totalAmount
  const remaining = Math.max(0, baseValue - totalPaid)
  const collectionPct = baseValue > 0 ? Math.round((totalPaid / baseValue) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <CreditCard className="h-4 w-4 text-blue-700" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">جدول الدفعات</h3>
          {payments.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{payments.length}</span>
          )}
        </div>
        {canManage && (
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            إضافة دفعة
          </Button>
        )}
      </div>

      {/* Summary */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <SummaryFigure label="قيمة المشروع" value={formatCurrency(baseValue)} tone="text-gray-900" />
            <SummaryFigure label="إجمالي المدفوع" value={formatCurrency(totalPaid)} tone="text-emerald-600" />
            <SummaryFigure label="المتبقي" value={formatCurrency(remaining)} tone={remaining > 0 ? 'text-amber-600' : 'text-emerald-600'} highlight />
          </div>
          {baseValue > 0 && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-all duration-500 ${collectionPct >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, collectionPct)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{collectionPct}% مُحصَّل من قيمة المشروع</p>
            </>
          )}
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState message="لا توجد دفعات مضافة" description="أضف جدول الدفعات للمشروع" icon={<CreditCard className="h-8 w-8 text-gray-400" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {payments.map((payment, idx) => {
            const overdue = isOverdue(payment.due_date, payment.status)
            const displayStatus = overdue && payment.status === 'pending' ? 'overdue' : payment.status
            const paidPct = payment.amount > 0 ? Math.min(100, Math.round((payment.paid_amount / payment.amount) * 100)) : 0
            const canEdit = canManage && payment.status !== 'cancelled'
            const canDelete = canManage && payment.status !== 'cancelled'
            const attachCount = attachmentsFor(payment.id).length + (payment.receipt_url ? 1 : 0)

            return (
              <div key={payment.id} className={`rounded-2xl border shadow-sm overflow-hidden ${
                overdue ? 'border-red-200 bg-red-50/20'
                : payment.status === 'paid' ? 'border-green-200 bg-green-50/10'
                : payment.status === 'cancelled' ? 'border-gray-200 bg-gray-50/50 opacity-60'
                : 'border-gray-100 bg-white'}`}>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-bold text-gray-500">
                          {payment.order_no ?? idx + 1}
                        </span>
                        <p className="text-base font-extrabold text-gray-900 truncate">
                          {paymentLabel(payment)}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-1 leading-tight">{formatCurrency(payment.amount)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PaymentStatusBadge status={displayStatus} />
                      {canEdit && (
                        <button onClick={() => setEditPaymentId(payment.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="تعديل">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDeletePayment(payment)} disabled={isPending} className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {payment.due_date && (
                    <p className={`flex items-center gap-1.5 text-xs mb-3 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      <Receipt className="h-3 w-3 shrink-0" />
                      استحقاق: {formatDateShort(payment.due_date)}
                      {overdue && <span className="text-red-500">(متأخر)</span>}
                    </p>
                  )}

                  {payment.paid_amount > 0 && payment.status !== 'paid' && payment.status !== 'cancelled' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>محصّل: <strong className="text-gray-700">{formatCurrency(payment.paid_amount)}</strong></span>
                        <span className="font-semibold text-brand-600">{paidPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${paidPct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">متبقي: {formatCurrency(payment.amount - payment.paid_amount)}</p>
                    </div>
                  )}

                  {payment.status === 'paid' && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-2">
                      <Receipt className="h-3.5 w-3.5" />
                      مدفوع بالكامل — {formatCurrency(payment.amount)}
                    </div>
                  )}

                  {payment.invoice_number && (
                    <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500">رقم الفاتورة:</span>
                      <span className="text-xs font-bold text-gray-800 truncate" dir="ltr">{payment.invoice_number}</span>
                      <button
                        onClick={() => copyInvoiceNumber(payment.id, payment.invoice_number!)}
                        className="ms-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
                        title="نسخ رقم الفاتورة (لـ SAP)"
                      >
                        {copiedId === payment.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {copiedId === payment.id ? 'تم' : 'نسخ'}
                      </button>
                    </div>
                  )}

                  {/* Sales engineer double-check */}
                  {(canConfirmSales || payment.sales_invoice_sent || payment.sales_payment_confirmed) && (
                    <div className="mb-2 space-y-1.5 rounded-lg bg-emerald-50/40 border border-emerald-100 p-2.5">
                      <p className="text-[11px] font-semibold text-emerald-700">تأكيد مهندس المبيعات</p>
                      <SalesCheck
                        icon={<Send className="h-3.5 w-3.5" />}
                        label="تم إرسال الفاتورة للعميل"
                        active={payment.sales_invoice_sent}
                        canToggle={canConfirmSales}
                        disabled={isPending}
                        onToggle={() => handleSalesToggle(payment.id, 'sales_invoice_sent', !payment.sales_invoice_sent)}
                      />
                      <SalesCheck
                        icon={<CircleCheck className="h-3.5 w-3.5" />}
                        label="العميل دفع المبلغ"
                        active={payment.sales_payment_confirmed}
                        canToggle={canConfirmSales}
                        disabled={isPending}
                        onToggle={() => handleSalesToggle(payment.id, 'sales_payment_confirmed', !payment.sales_payment_confirmed)}
                      />
                    </div>
                  )}

                  {payment.notes && <p className="text-xs text-gray-500 italic mb-2">{payment.notes}</p>}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setAttachmentsPaymentId(payment.id)}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    المرفقات
                    {attachCount > 0 && (
                      <span className="rounded-full bg-brand-100 px-1.5 text-[10px] font-bold text-brand-700">{attachCount}</span>
                    )}
                  </button>
                  {canManage && payment.status !== 'paid' && payment.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" onClick={() => setRecordPaymentId(payment.id)}>تسجيل دفعة</Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add payment dialog ── */}
      <Dialog open={showAddDialog} onClose={closeAddDialog} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة دفعة جديدة</DialogTitle>
          <DialogClose onClose={closeAddDialog} />
        </DialogHeader>
        <DialogContent className="max-h-[60vh] overflow-y-auto">
          <form id="add-payment-form" onSubmit={handleAddPayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label>نوع الدفعة</Label>
              <Select name="type" required placeholder="اختر النوع" value={addType} onChange={(e) => setAddType(e.target.value)}>
                {PAYMENT_TYPES.filter((t) => hasInstallation || t !== 'installation').map((type) => {
                  const isBlocked = type !== 'custom' && usedTypes.has(type)
                  const isPaid = paidTypes.has(type)
                  const label = type === 'custom' ? 'أخرى' : PAYMENT_TYPE_LABELS[type]
                  return (
                    <option key={type} value={type} disabled={isBlocked}>
                      {label}{isPaid ? ' — مؤكدة الدفع' : isBlocked ? ' — موجودة مسبقاً' : ''}
                    </option>
                  )
                })}
              </Select>
            </div>

            {addType === 'custom' && (
              <div className="space-y-1.5">
                <Label>اسم الدفعة</Label>
                <Input name="name" required placeholder="مثال: دفعة ضمان، دفعة إضافية..." />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>رقم الدفعة (الترتيب)</Label>
                <Input name="order_no" type="number" min="1" step="1" defaultValue={payments.length + 1} placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <Label>النسبة (%)</Label>
                <Input name="percentage" type="number" min="0" max="100" step="0.1" placeholder="اختياري" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>المبلغ (ريال)</Label>
              <Input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الاستحقاق</Label>
              <Input name="due_date" type="date" dir="ltr" />
            </div>

            {/* Invoice fields (manual + OCR autofill) */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500">بيانات الفاتورة الضريبية</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>رقم الفاتورة</Label>
                  <Input name="invoice_number" dir="ltr" placeholder="—" value={inv.invoice_number}
                    onChange={(e) => setInv((p) => ({ ...p, invoice_number: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الفاتورة</Label>
                  <Input name="invoice_date" dir="ltr" placeholder="YYYY-MM-DD" value={inv.invoice_date}
                    onChange={(e) => setInv((p) => ({ ...p, invoice_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>اسم الشركة / البائع</Label>
                  <Input name="seller_name" placeholder="—" value={inv.seller_name}
                    onChange={(e) => setInv((p) => ({ ...p, seller_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم حساب العميل</Label>
                  <Input name="customer_account" dir="ltr" placeholder="—" value={inv.customer_account}
                    onChange={(e) => setInv((p) => ({ ...p, customer_account: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Primary attachment — labelled by the payment type */}
            <div className="space-y-1.5">
              <Label>
                المرفق الأساسي
                <span className="text-gray-400 font-normal"> — {addType === 'custom' ? 'مرفق الدفعة' : `مرفق ${PAYMENT_TYPE_LABELS[addType as keyof typeof PAYMENT_TYPE_LABELS] ?? 'الدفعة'}`}</span>
              </Label>
              {primaryFile ? (
                <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
                  {primaryFile.type === 'application/pdf' ? <FileText className="h-4 w-4 text-brand-700 shrink-0" /> : <ImageIcon className="h-4 w-4 text-brand-700 shrink-0" />}
                  <span className="flex-1 text-sm text-gray-800 truncate">{primaryFile.name}</span>
                  <button type="button" onClick={() => setPrimaryFile(null)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => primaryInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-3 text-sm text-gray-500 hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                  <Upload className="h-4 w-4" /> رفع المرفق الأساسي
                </button>
              )}
              <input ref={primaryInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                onChange={(e) => { setPrimaryFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
            </div>

            {/* Other attachments (multiple) */}
            <div className="space-y-1.5">
              <Label>مرفقات أخرى <span className="text-gray-400 font-normal">— اختياري (أكثر من ملف)</span></Label>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                {otherFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {otherFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-1.5">
                        {f.type === 'application/pdf' ? <FileText className="h-4 w-4 text-gray-400 shrink-0" /> : <ImageIcon className="h-4 w-4 text-gray-400 shrink-0" />}
                        <span className="flex-1 text-xs text-gray-700 truncate">{f.name}</span>
                        <button type="button" onClick={() => setOtherFiles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => otherInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                  <Upload className="h-4 w-4" /> إضافة ملفات
                </button>
                <input ref={otherInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                  onChange={(e) => { setOtherFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input name="notes" placeholder="اختياري" />
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={closeAddDialog}>إلغاء</Button>
          <Button type="submit" form="add-payment-form" loading={isPending}>إضافة</Button>
        </DialogFooter>
      </Dialog>

      {/* ── Edit payment dialog ── */}
      <Dialog open={!!editPaymentId} onClose={() => setEditPaymentId(null)}>
        <DialogHeader>
          <DialogTitle>تعديل الدفعة — {editingPayment && paymentLabel(editingPayment)}</DialogTitle>
          <DialogClose onClose={() => setEditPaymentId(null)} />
        </DialogHeader>
        <DialogContent>
          {editingPayment && (
            <form id="edit-payment-form" onSubmit={handleEditPayment} className="space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600">
                المبلغ الحالي: <strong className="text-gray-900">{formatCurrency(editingPayment.amount)}</strong>
                {editingPayment.paid_amount > 0 && (
                  <span className="ms-2 text-xs text-amber-600">(محصّل: {formatCurrency(editingPayment.paid_amount)})</span>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>رقم الدفعة (الترتيب)</Label>
                  <Input name="order_no" type="number" min="1" step="1"
                    defaultValue={editingPayment.order_no ?? (payments.findIndex((p) => p.id === editingPayment.id) + 1)} />
                </div>
                <div className="space-y-1.5">
                  <Label>المبلغ الجديد (ريال)</Label>
                  <Input name="amount" type="number" min="0.01" step="0.01" required defaultValue={editingPayment.amount} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الاستحقاق</Label>
                <Input name="due_date" type="date" dir="ltr" defaultValue={editingPayment.due_date ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Input name="notes" defaultValue={editingPayment.notes ?? ''} placeholder="اختياري" />
              </div>
            </form>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditPaymentId(null)}>إلغاء</Button>
          <Button type="submit" form="edit-payment-form" loading={isPending}>
            <Edit2 className="h-4 w-4" />
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Record payment dialog ── */}
      <Dialog open={!!recordPaymentId} onClose={handleRecordClose}>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {selectedPayment && paymentLabel(selectedPayment)}</DialogTitle>
          <DialogClose onClose={handleRecordClose} />
        </DialogHeader>
        <DialogContent>
          {selectedPayment && (
            <form id="record-payment-form" onSubmit={handleRecordPayment} className="space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm space-y-1">
                <p className="text-gray-600">إجمالي الدفعة: <span className="font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</span></p>
                <p className="text-gray-600">المحصّل: <span className="font-bold text-gray-900">{formatCurrency(selectedPayment.paid_amount)}</span></p>
                <p className="text-gray-600">المتبقي: <span className="font-bold text-red-600">{formatCurrency(selectedPayment.amount - selectedPayment.paid_amount)}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label>المبلغ المحصّل الآن (ريال)</Label>
                <Input name="paid_amount" type="number" min="0.01" max={selectedPayment.amount - selectedPayment.paid_amount} step="0.01" required placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>إيصال الدفع (صورة أو PDF)</Label>
                <input type="hidden" name="receipt_url" />
                {receiptFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100">
                      {receiptFile.type === 'application/pdf' ? <FileText className="h-5 w-5 text-brand-700" /> : <ImageIcon className="h-5 w-5 text-brand-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{receiptFile.name}</p>
                      <p className="text-xs text-gray-500">{(receiptFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={() => { setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">اضغط لرفع الإيصال</p>
                    <p className="text-xs text-gray-400">JPG، PNG، PDF — حتى 10 ميجابايت</p>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-gray-400">يمكنك إضافة مرفقات أخرى (فاتورة، ضمان...) من زر «المرفقات» بعد التسجيل.</p>
              </div>
            </form>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={handleRecordClose}>إلغاء</Button>
          <Button type="submit" form="record-payment-form" loading={isPending} variant="success">
            {isPending ? 'جاري الرفع...' : 'تأكيد الاستلام'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Attachments dialog ── */}
      <Dialog open={!!attachmentsPaymentId} onClose={() => setAttachmentsPaymentId(null)}>
        <DialogHeader>
          <DialogTitle>مرفقات الدفعة — {attachmentsPayment && paymentLabel(attachmentsPayment)}</DialogTitle>
          <DialogClose onClose={() => setAttachmentsPaymentId(null)} />
        </DialogHeader>
        <DialogContent>
          {attachmentsPayment && (
            <div className="space-y-3">
              {/* Primary receipt (from record payment) */}
              {attachmentsPayment.receipt_url && (
                <AttachmentRow
                  label="إيصال الدفع الأساسي"
                  url={attachmentsPayment.receipt_url}
                  canManage={canManage}
                  onDelete={() => handleDeleteReceipt(attachmentsPayment.id)}
                />
              )}

              {/* Extra attachments */}
              {attachmentsFor(attachmentsPayment.id).map((doc) => (
                <AttachmentRow
                  key={doc.id}
                  label={doc.description || 'مرفق'}
                  url={doc.url}
                  canManage={canManage}
                  onDelete={() => handleDeleteAttachment(doc.id)}
                />
              ))}

              {!attachmentsPayment.receipt_url && attachmentsFor(attachmentsPayment.id).length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">لا توجد مرفقات لهذه الدفعة</p>
              )}

              {canManage && (
                <>
                  <button type="button" onClick={() => attachInputRef.current?.click()} disabled={uploadingAttachment}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-4 text-sm text-gray-500 hover:border-brand-300 hover:bg-brand-50/30 transition-colors disabled:opacity-60">
                    {uploadingAttachment ? <Upload className="h-4 w-4 animate-pulse" /> : <Paperclip className="h-4 w-4" />}
                    {uploadingAttachment ? 'جاري الرفع...' : 'إضافة مرفقات (إيصال، فاتورة، ضمان...)'}
                  </button>
                  <input ref={attachInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleAttachmentUpload} />
                  <p className="text-xs text-gray-400 text-center">يمكنك رفع أكثر من ملف — بدون اسم إلزامي</p>
                </>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setAttachmentsPaymentId(null)}>تم</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function SalesCheck({ icon, label, active, canToggle, disabled, onToggle }: {
  icon: React.ReactNode
  label: string
  active: boolean
  canToggle: boolean
  disabled: boolean
  onToggle: () => void
}) {
  if (!canToggle) {
    // Read-only view (coordinator/admin) — only show when confirmed
    if (!active) return null
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-700">
        <CircleCheck className="h-3.5 w-3.5 shrink-0" />
        <span>{label} ✓</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors disabled:opacity-50 ${active ? 'text-emerald-700' : 'text-gray-500 hover:bg-emerald-50'}`}
    >
      <span className={active ? 'text-emerald-600' : 'text-gray-300'}>
        {active ? <CircleCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </span>
      <span className="text-gray-400">{icon}</span>
      <span className={active ? 'font-medium' : ''}>{label}</span>
    </button>
  )
}

function SummaryFigure({ label, value, tone, highlight }: { label: string; value: string; tone: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 text-center ${highlight ? 'border-amber-100 bg-amber-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function AttachmentRow({ label, url, canManage, onDelete }: { label: string; url: string; canManage: boolean; onDelete: () => void }) {
  const isPdf = url.toLowerCase().includes('.pdf')
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
        {isPdf ? <FileText className="h-4 w-4 text-gray-500" /> : <ImageIcon className="h-4 w-4 text-gray-500" />}
      </div>
      <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{label}</span>
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 shrink-0">
        <ExternalLink className="h-3.5 w-3.5" /> عرض
      </a>
      {canManage && (
        <button onClick={onDelete} className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="حذف">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
