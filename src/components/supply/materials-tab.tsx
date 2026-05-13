'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Package, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { MaterialStatusBadge, SupplyStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { createMaterialRequest, updateMaterialStatus, scheduleSupplyOrder, completeSupplyOrder } from '@/lib/actions/materials'
import { formatDateShort } from '@/lib/utils'
import type { Material, SupplyOrder, Profile, Payment, MaterialItem } from '@/types/database'

interface MaterialsTabProps {
  materials: Material[]
  supplyOrders: SupplyOrder[]
  projectId: string
  currentProfile: Profile
  payments: Payment[]
}

export function MaterialsTab({ materials, supplyOrders, projectId, currentProfile, payments }: MaterialsTabProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [items, setItems] = useState<MaterialItem[]>([{ name: '', quantity: 1, unit: 'قطعة' }])
  const [isPending, startTransition] = useTransition()

  const canRequest = ['coordinator', 'admin'].includes(currentProfile.role)
  const canUpdateStatus = ['supply', 'coordinator', 'admin'].includes(currentProfile.role)
  const supplyPaymentPaid = payments.some((p) => p.type === 'supply' && p.status === 'paid')

  function addItem() {
    setItems([...items, { name: '', quantity: 1, unit: 'قطعة' }])
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }
  function updateItem(idx: number, field: keyof MaterialItem, value: string | number) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleRequestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validItems = items.filter((it) => it.name.trim())
    if (validItems.length === 0) {
      toast.error('أضف مادة واحدة على الأقل')
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)
    formData.set('items', JSON.stringify(validItems))

    startTransition(async () => {
      const result = await createMaterialRequest(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('تم إرسال طلب المواد'); setShowRequestDialog(false) }
    })
  }

  function handleScheduleSupply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('project_id', projectId)

    startTransition(async () => {
      const result = await scheduleSupplyOrder(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('تم جدولة التوريد'); setShowScheduleDialog(false) }
    })
  }

  function handleStatusUpdate(materialId: string, status: Material['status']) {
    startTransition(async () => {
      const result = await updateMaterialStatus(materialId, status, projectId)
      if (result?.error) toast.error(result.error)
      else toast.success('تم تحديث الحالة')
    })
  }

  function handleCompleteOrder(orderId: string) {
    startTransition(async () => {
      const result = await completeSupplyOrder(orderId, projectId)
      if (result?.error) toast.error(result.error)
      else toast.success('تم تأكيد اكتمال التوريد')
    })
  }

  return (
    <div className="space-y-6">
      {/* Material Requests */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">طلبات المواد</h3>
          {canRequest && (
            <Button size="sm" onClick={() => setShowRequestDialog(true)}>
              <Plus className="h-4 w-4" />
              طلب مواد
            </Button>
          )}
        </div>

        {materials.length === 0 ? (
          <EmptyState
            message="لا توجد طلبات مواد"
            icon={<Package className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="space-y-3">
            {materials.map((material) => (
              <Card key={material.id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{formatDateShort(material.requested_at)}</p>
                      {material.notes && <p className="text-sm text-gray-600">{material.notes}</p>}
                    </div>
                    <MaterialStatusBadge status={material.status} />
                  </div>
                  <div className="mb-3 space-y-1">
                    {(material.items as MaterialItem[]).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        {item.name} — {item.quantity} {item.unit}
                        {item.notes && <span className="text-gray-400">({item.notes})</span>}
                      </div>
                    ))}
                  </div>
                  {canUpdateStatus && material.status !== 'delivered' && (
                    <div className="flex gap-2">
                      {material.status === 'pending' && (
                        <Button size="sm" variant="outline" loading={isPending} onClick={() => handleStatusUpdate(material.id, 'preparing')}>
                          بدء التجهيز
                        </Button>
                      )}
                      {material.status === 'preparing' && (
                        <Button size="sm" variant="success" loading={isPending} onClick={() => handleStatusUpdate(material.id, 'ready')}>
                          جاهز للتوريد
                        </Button>
                      )}
                      {material.status === 'ready' && (
                        <Button size="sm" variant="success" loading={isPending} onClick={() => handleStatusUpdate(material.id, 'delivered')}>
                          تم التوريد
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Supply Orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">طلبات التوريد</h3>
          {canUpdateStatus && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowScheduleDialog(true)}
              disabled={!supplyPaymentPaid}
              title={!supplyPaymentPaid ? 'دفعة التوريد غير مكتملة' : undefined}
            >
              <Truck className="h-4 w-4" />
              جدولة توريد
            </Button>
          )}
        </div>

        {!supplyPaymentPaid && supplyOrders.length === 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            دفعة التوريد غير مسددة — لا يمكن جدولة التوريد
          </div>
        )}

        {supplyOrders.length > 0 && (
          <div className="space-y-3">
            {supplyOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        توريد مجدول — {formatDateShort(order.scheduled_date)}
                      </p>
                    </div>
                    <SupplyStatusBadge status={order.status} />
                  </div>
                  {canUpdateStatus && order.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="success"
                      className="mt-3"
                      loading={isPending}
                      onClick={() => handleCompleteOrder(order.id)}
                    >
                      تأكيد اكتمال التوريد
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request materials dialog */}
      <Dialog open={showRequestDialog} onClose={() => setShowRequestDialog(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>طلب مواد جديدة</DialogTitle>
          <DialogClose onClose={() => setShowRequestDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <form id="request-form" onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label>اسم المادة</Label>
                    <Input value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="مثال: أبواب خشبية" />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label>الكمية</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))} />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label>الوحدة</Label>
                    <Input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} placeholder="قطعة" />
                  </div>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
              إضافة مادة
            </Button>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Input name="notes" placeholder="اختياري" />
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRequestDialog(false)}>إلغاء</Button>
          <Button type="submit" form="request-form" loading={isPending}>إرسال الطلب</Button>
        </DialogFooter>
      </Dialog>

      {/* Schedule supply dialog */}
      <Dialog open={showScheduleDialog} onClose={() => setShowScheduleDialog(false)}>
        <DialogHeader>
          <DialogTitle>جدولة طلب توريد</DialogTitle>
          <DialogClose onClose={() => setShowScheduleDialog(false)} />
        </DialogHeader>
        <DialogContent>
          <form id="schedule-form" onSubmit={handleScheduleSupply} className="space-y-4">
            <div className="space-y-1.5">
              <Label>تاريخ التوريد</Label>
              <Input name="scheduled_date" type="date" dir="ltr" required />
            </div>
            {materials.length > 0 && (
              <div className="space-y-1.5">
                <Label>طلب المواد المرتبط</Label>
                <Select name="material_id" placeholder="اختر الطلب (اختياري)">
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      طلب {formatDateShort(m.requested_at)}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>إلغاء</Button>
          <Button type="submit" form="schedule-form" loading={isPending}>جدولة</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
