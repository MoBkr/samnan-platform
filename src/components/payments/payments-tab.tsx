'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, CreditCard, Receipt, Upload, X, FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { PaymentStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { createPayment, recordPayment } from '@/lib/actions/payments'
import { uploadFile } from '@/lib/actions/upload'
import { formatCurrency, formatDateShort, isOverdue } from '@/lib/utils'
import { PAYMENT_TYPE_LABELS } from '@/lib/constants'
import type { Payment, Profile } from '@/types/database'

interface PaymentsTabProps {
  payments: Payment[]
  projectId: string
  currentProfile: Profile
}

export function PaymentsTab({ payments, projectId, currentProfile }: PaymentsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [recordPaymentId, setRecordPaymentId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddPayment = ['coordinator', 'admin'].includes(currentProfile.role)
  const canRecordPayment = ['coordinator', 'admin'].includes(currentProfile.role)
  const selectedPayment = payments.find((p) => p.id === recordPaymentId)

  function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)
    startTransition(async () => {
      const result = await createPayment(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('تم إضافة الدفعة بنجاح'); setShowAddDialog(false) }
    })
  }

  function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    startTransition(async () => {
      let receiptUrl = (form.elements.namedItem('receipt_url') as HTMLInputElement)?.value || ''

      // Upload file if provided
      if (receiptFile) {
        const uploadFormData = new FormData()
        uploadFormData.set('file', receiptFile)
        uploadFormData.set('folder', 'receipts')
        const uploadResult = await uploadFile(uploadFormData)
        if ('error' in uploadResult) {
          toast.error(uploadResult.error)
          return
        }
        receiptUrl = uploadResult.url
      }

      const formData = new FormData(form)
      formData.set('payment_id', recordPaymentId!)
      formData.set('project_id', projectId)
      formData.set('receipt_url', receiptUrl)

      const result = await recordPayment(formData)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('تم تسجيل الدفعة بنجاح')
        setRecordPaymentId(null)
        setReceiptFile(null)
      }
    })
  }

  function handleDialogClose() {
    setRecordPaymentId(null)
    setReceiptFile(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">جدول الدفعات</h3>
        {canAddPayment && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            إضافة دفعة
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <EmptyState
          message="لا توجد دفعات مضافة"
          description="أضف جدول الدفعات للمشروع"
          icon={<CreditCard className="h-8 w-8 text-gray-400" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {payments.map((payment) => {
            const overdue = isOverdue(payment.due_date, payment.status)
            const displayStatus = overdue && payment.status === 'pending' ? 'overdue' : payment.status

            return (
              <div
                key={payment.id}
                className={`rounded-2xl border p-5 ${overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'} shadow-sm`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {PAYMENT_TYPE_LABELS[payment.type]}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <PaymentStatusBadge status={displayStatus} />
                </div>

                {payment.due_date && (
                  <p className="mb-2 text-sm text-gray-500">
                    الاستحقاق: {formatDateShort(payment.due_date)}
                  </p>
                )}

                {payment.paid_amount > 0 && payment.status !== 'paid' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>المحصّل: {formatCurrency(payment.paid_amount)}</span>
                      <span>{Math.round((payment.paid_amount / payment.amount) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.min(100, (payment.paid_amount / payment.amount) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {payment.receipt_url && (
                  <a
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-3 flex items-center gap-1.5 text-xs text-brand-600 hover:underline font-medium"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    عرض الإيصال
                  </a>
                )}

                {canRecordPayment && payment.status !== 'paid' && payment.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 w-full"
                    onClick={() => setRecordPaymentId(payment.id)}
                  >
                    تسجيل دفعة
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add payment dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)}>
        <DialogHeader>
          <DialogTitle>إضافة دفعة جديدة</DialogTitle>
          <DialogClose onClose={() => setShowAddDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <form id="add-payment-form" onSubmit={handleAddPayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label>نوع الدفعة</Label>
              <Select name="type" required placeholder="اختر النوع">
                <option value="upfront">دفعة أولى</option>
                <option value="supply">دفعة توريد</option>
                <option value="installation">دفعة تركيب</option>
                <option value="final">دفعة نهائية</option>
                <option value="custom">مخصصة</option>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>المبلغ (ريال)</Label>
                <Input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>النسبة (%)</Label>
                <Input name="percentage" type="number" min="0" max="100" step="0.1" placeholder="اختياري" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الاستحقاق</Label>
              <Input name="due_date" type="date" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input name="notes" placeholder="اختياري" />
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
          <Button type="submit" form="add-payment-form" loading={isPending}>إضافة</Button>
        </DialogFooter>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={!!recordPaymentId} onClose={handleDialogClose}>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {selectedPayment && PAYMENT_TYPE_LABELS[selectedPayment.type]}</DialogTitle>
          <DialogClose onClose={handleDialogClose} />
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
                <Input
                  name="paid_amount"
                  type="number"
                  min="0.01"
                  max={selectedPayment.amount - selectedPayment.paid_amount}
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </div>

              {/* File upload for receipt */}
              <div className="space-y-1.5">
                <Label>إيصال الدفع (صورة أو PDF)</Label>
                <input type="hidden" name="receipt_url" />
                {receiptFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100">
                      {receiptFile.type === 'application/pdf'
                        ? <FileText className="h-5 w-5 text-brand-700" />
                        : <ImageIcon className="h-5 w-5 text-brand-700" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{receiptFile.name}</p>
                      <p className="text-xs text-gray-500">{(receiptFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">اضغط لرفع الإيصال</p>
                    <p className="text-xs text-gray-400">JPG، PNG، PDF — حتى 10 ميجابايت</p>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </form>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>إلغاء</Button>
          <Button
            type="submit"
            form="record-payment-form"
            loading={isPending}
            variant="success"
          >
            {isPending ? 'جاري الرفع...' : 'تأكيد الاستلام'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
