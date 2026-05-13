'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { PaymentStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { createPayment, recordPayment } from '@/lib/actions/payments'
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

  const canAddPayment = ['coordinator', 'admin'].includes(currentProfile.role)
  const canRecordPayment = ['coordinator', 'admin'].includes(currentProfile.role)

  const selectedPayment = payments.find((p) => p.id === recordPaymentId)

  function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)

    startTransition(async () => {
      const result = await createPayment(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('تم إضافة الدفعة بنجاح')
        setShowAddDialog(false)
      }
    })
  }

  function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('payment_id', recordPaymentId!)
    formData.set('project_id', projectId)

    startTransition(async () => {
      const result = await recordPayment(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('تم تسجيل الدفعة بنجاح')
        setRecordPaymentId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">جدول الدفعات</h3>
        {canAddPayment && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            إضافة دفعة
          </Button>
        )}
      </div>

      {/* Payment cards */}
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
              <Card key={payment.id} className={overdue ? 'border-red-200 bg-red-50/30' : ''}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {PAYMENT_TYPE_LABELS[payment.type]}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
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
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">
                        المحصّل: {formatCurrency(payment.paid_amount)}
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, (payment.paid_amount / payment.amount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Receipt className="h-3 w-3" />
                      عرض الإيصال
                    </a>
                  )}

                  {canRecordPayment && payment.status !== 'paid' && payment.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => setRecordPaymentId(payment.id)}
                    >
                      تسجيل دفعة
                    </Button>
                  )}
                </CardContent>
              </Card>
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
      <Dialog open={!!recordPaymentId} onClose={() => setRecordPaymentId(null)}>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {selectedPayment && PAYMENT_TYPE_LABELS[selectedPayment.type]}</DialogTitle>
          <DialogClose onClose={() => setRecordPaymentId(null)} />
        </DialogHeader>
        <DialogContent>
          {selectedPayment && (
            <form id="record-payment-form" onSubmit={handleRecordPayment} className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-gray-600">إجمالي الدفعة: <span className="font-semibold text-gray-900">{formatCurrency(selectedPayment.amount)}</span></p>
                <p className="text-gray-600">المحصّل: <span className="font-semibold text-gray-900">{formatCurrency(selectedPayment.paid_amount)}</span></p>
                <p className="text-gray-600">المتبقي: <span className="font-semibold text-red-600">{formatCurrency(selectedPayment.amount - selectedPayment.paid_amount)}</span></p>
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
              <div className="space-y-1.5">
                <Label>رابط الإيصال</Label>
                <Input name="receipt_url" type="url" placeholder="https://..." dir="ltr" />
              </div>
            </form>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRecordPaymentId(null)}>إلغاء</Button>
          <Button type="submit" form="record-payment-form" loading={isPending} variant="success">
            تأكيد الاستلام
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
