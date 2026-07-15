'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { formatCurrency } from '@/lib/utils'
import { PAYMENT_STATUS_LABELS } from '@/lib/constants'
import { notify } from '@/lib/actions/notifications'
import { removeStorageFiles } from '@/lib/file-cleanup'
import type { Payment, PaymentType } from '@/types/database'
import type { QueryResult, QueryResultMany } from '@/lib/supabase/typed'

// Project team + name, for routing notifications
async function projectTeam(service: ReturnType<typeof createServiceClient>, projectId: string) {
  const r = (await service
    .from('projects').select('coordinator_id, sales_engineer_id, installation_id, project_name').eq('id', projectId).single()) as QueryResult<{
      coordinator_id: string | null; sales_engineer_id: string | null; installation_id: string | null; project_name: string
    }>
  return r.data
}

export async function getProjectPayments(projectId: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('order_no', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })) as QueryResultMany<Payment>
  return result.data ?? []
}

export async function getAllOverduePayments() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const result = (await supabase
    .from('payments')
    .select('*, project:projects(id, client_name, project_name)')
    .lte('due_date', today)
    .in('status', ['pending', 'partial'])
    .order('due_date', { ascending: true })) as QueryResultMany<Payment & { project: { id: string; client_name: string; project_name: string } }>
  return result.data ?? []
}

export async function createPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const projectId = formData.get('project_id') as string
  const type = formData.get('type') as PaymentType
  const amount = formData.get('amount') as string
  const dueDate = formData.get('due_date') as string
  const percentage = formData.get('percentage') as string
  const notes = formData.get('notes') as string
  const name = (formData.get('name') as string)?.trim()
  const orderNoRaw = formData.get('order_no') as string
  const invoiceNumber = (formData.get('invoice_number') as string)?.trim()
  const invoiceDate = (formData.get('invoice_date') as string)?.trim()
  const sellerName = (formData.get('seller_name') as string)?.trim()
  const customerAccount = (formData.get('customer_account') as string)?.trim()

  if (!projectId || !type || !amount) {
    return { error: 'يرجى ملء جميع الحقول المطلوبة' }
  }
  if (type === 'custom' && !name) {
    return { error: 'يرجى كتابة اسم الدفعة' }
  }

  const service = createServiceClient()
  const { data, error } = (await service.from('payments').insert({
    project_id: projectId,
    type,
    // For custom payments `name` is the title; for the others it's an optional
    // secondary title shown under the type name.
    name: name || null,
    order_no: orderNoRaw ? parseInt(orderNoRaw, 10) : null,
    invoice_number: invoiceNumber || null,
    invoice_date: invoiceDate || null,
    seller_name: sellerName || null,
    customer_account: customerAccount || null,
    amount: parseFloat(amount),
    due_date: dueDate || null,
    percentage: percentage ? parseFloat(percentage) : null,
    notes: notes || null,
    status: 'pending',
    paid_amount: 0,
  } as never)
    .select('id')
    .single()) as unknown as { data: { id: string } | null; error: Error | null }

  if (error) return { error: 'فشل إنشاء الدفعة' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'إضافة دفعة جديدة',
    details: { type, amount },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true, paymentId: data?.id }
}

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const paymentId = formData.get('payment_id') as string
  const paidAmount = parseFloat(formData.get('paid_amount') as string)
  const receiptUrl = formData.get('receipt_url') as string
  const projectId = formData.get('project_id') as string

  if (!paymentId || isNaN(paidAmount) || paidAmount <= 0) {
    return { error: 'يرجى إدخال مبلغ صحيح' }
  }

  const service = createServiceClient()

  // Get current payment
  const { data: payment } = (await service
    .from('payments')
    .select('amount, paid_amount')
    .eq('id', paymentId)
    .single()) as unknown as { data: { amount: number; paid_amount: number } | null }

  if (!payment) return { error: 'الدفعة غير موجودة' }

  const remaining = payment.amount - payment.paid_amount
  if (paidAmount > remaining) {
    return { error: `المبلغ المُدخل (${paidAmount}) يتجاوز المتبقي (${remaining})` }
  }

  const newPaidAmount = payment.paid_amount + paidAmount
  const newStatus = newPaidAmount >= payment.amount ? 'paid' : 'partial'

  const { error } = (await service
    .from('payments')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      receipt_url: receiptUrl || null,
    } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تسجيل الدفعة' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: newStatus === 'paid' ? 'تم سداد الدفعة بالكامل' : 'تم سداد جزء من الدفعة',
    details: { payment_id: paymentId, paid_amount: paidAmount, new_status: newStatus },
  } as never)

  // Notify the project's coordinator + sales engineer
  const team = await projectTeam(service, projectId)
  await notify([team?.coordinator_id, team?.sales_engineer_id], {
    title: newStatus === 'paid' ? 'تم سداد دفعة بالكامل' : 'تم سداد جزء من دفعة',
    body: `مشروع «${team?.project_name ?? ''}» — مبلغ ${formatCurrency(paidAmount)}`,
    link: `/projects/${projectId}`, type: 'payment', projectId,
  }, user.id)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deletePayment(paymentId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()

  // Only allow deletion if payment is not fully paid
  const { data: payment } = (await service
    .from('payments')
    .select('status, receipt_url')
    .eq('id', paymentId)
    .single()) as unknown as { data: { status: string; receipt_url: string | null } | null }

  if (!payment) return { error: 'الدفعة غير موجودة' }

  // Attachments reference the payment (FK) — remove them first, otherwise the
  // delete is rejected and the user just sees "فشل".
  const { data: payDocs } = (await service
    .from('documents').select('url').eq('payment_id', paymentId)) as unknown as { data: { url: string }[] | null }
  await service.from('documents').delete().eq('payment_id', paymentId)

  const { error } = (await service
    .from('payments')
    .delete()
    .eq('id', paymentId)) as unknown as { error: { message?: string } | null }

  if (error) {
    console.error('[deletePayment] failed:', error)
    return { error: `فشل حذف الدفعة — ${error.message ?? 'يوجد سجلات مرتبطة بها'}` }
  }

  // Its receipts leave no orphans behind in storage
  const payUrls = [...(payDocs ?? []).map((d) => d.url), ...(payment.receipt_url ? [payment.receipt_url] : [])]
  await removeStorageFiles(service, payUrls)

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'حذف دفعة',
    details: { payment_id: paymentId },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

const PAYMENT_TYPES_SET = new Set(['upfront', 'materials', 'installation', 'final', 'custom'])
const PAYMENT_STATUS_SET = new Set(['pending', 'partial', 'paid', 'overdue', 'cancelled'])

export async function editPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const paymentId = formData.get('payment_id') as string
  const projectId = formData.get('project_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const dueDate = formData.get('due_date') as string
  const notes = formData.get('notes') as string
  const name = (formData.get('name') as string)?.trim() || null
  const orderNoRaw = formData.get('order_no') as string
  const orderNo = orderNoRaw ? parseInt(orderNoRaw, 10) : null
  const percentageRaw = formData.get('percentage') as string
  const percentage = percentageRaw ? parseFloat(percentageRaw) : null
  const invoiceNumber = (formData.get('invoice_number') as string)?.trim() || null
  const invoiceDate = (formData.get('invoice_date') as string)?.trim() || null
  const sellerName = (formData.get('seller_name') as string)?.trim() || null
  const customerAccount = (formData.get('customer_account') as string)?.trim() || null

  let type = (formData.get('type') as string) || null
  if (type && !PAYMENT_TYPES_SET.has(type)) type = null
  let status = (formData.get('status') as string) || null
  if (status && !PAYMENT_STATUS_SET.has(status)) status = null
  const paidAmountRaw = formData.get('paid_amount') as string
  const paidAmountInput = paidAmountRaw !== null && paidAmountRaw !== '' ? parseFloat(paidAmountRaw) : null

  if (!paymentId || isNaN(amount) || amount <= 0) return { error: 'يرجى إدخال مبلغ صحيح' }

  const service = createServiceClient()

  const { data: payment } = (await service
    .from('payments')
    .select('status, paid_amount, amount, due_date, notes, paid_at, type, name, order_no, percentage, invoice_number, invoice_date, seller_name, customer_account')
    .eq('id', paymentId)
    .single()) as unknown as {
      data: {
        status: string; paid_amount: number; amount: number; due_date: string | null; notes: string | null
        paid_at: string | null; type: string; name: string | null; order_no: number | null; percentage: number | null
        invoice_number: string | null; invoice_date: string | null; seller_name: string | null; customer_account: string | null
      } | null
    }

  if (!payment) return { error: 'الدفعة غير موجودة' }

  const finalType = type ?? payment.type
  // A secondary title is allowed on every type now (shown under the type name).
  const finalName = name

  // Collected amount + status are reconciled so the record never contradicts
  // itself: choosing a status sets the collected amount to match, and vice
  // versa. This is what lets a mis-clicked "partial"/"paid" be corrected.
  let paidAmount = paidAmountInput != null && !isNaN(paidAmountInput) ? paidAmountInput : payment.paid_amount
  paidAmount = Math.max(0, Math.min(paidAmount, amount))

  let finalStatus: string
  if (status) {
    // Explicit status wins; make the collected amount consistent with it.
    finalStatus = status
    if (status === 'paid') paidAmount = amount
    else if (status === 'pending' || status === 'overdue') paidAmount = 0
    // 'partial' / 'cancelled' keep the entered collected amount
  } else {
    // No explicit status → derive it from the collected amount.
    finalStatus = paidAmount >= amount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'
  }
  const paidAt = finalStatus === 'paid' ? (payment.paid_at ?? new Date().toISOString()) : null

  const { error } = (await service
    .from('payments')
    .update({
      type: finalType,
      name: finalName,
      amount,
      paid_amount: paidAmount,
      percentage,
      due_date: dueDate || null,
      notes: notes || null,
      order_no: orderNo,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      seller_name: sellerName,
      customer_account: customerAccount,
      status: finalStatus,
      paid_at: paidAt,
    } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تعديل الدفعة' }

  // ── Audit log: record old → new for each changed field ──
  const changes: Record<string, { from: string; to: string }> = {}
  if (payment.type !== finalType) changes['النوع'] = { from: payment.type, to: finalType }
  if ((payment.name ?? '') !== (finalName ?? '')) changes['العنوان الثانوي'] = { from: payment.name || '—', to: finalName || '—' }
  if ((payment.order_no ?? null) !== orderNo) {
    changes['رقم الدفعة'] = { from: payment.order_no != null ? String(payment.order_no) : '—', to: orderNo != null ? String(orderNo) : '—' }
  }
  if (payment.amount !== amount) changes['المبلغ'] = { from: formatCurrency(payment.amount), to: formatCurrency(amount) }
  if (payment.paid_amount !== paidAmount) changes['المحصّل'] = { from: formatCurrency(payment.paid_amount), to: formatCurrency(paidAmount) }
  if ((payment.percentage ?? null) !== percentage) changes['النسبة'] = { from: payment.percentage != null ? `${payment.percentage}%` : '—', to: percentage != null ? `${percentage}%` : '—' }
  if ((payment.due_date ?? '') !== (dueDate || '')) changes['تاريخ الاستحقاق'] = { from: payment.due_date || '—', to: dueDate || '—' }
  if ((payment.invoice_number ?? '') !== (invoiceNumber || '')) changes['رقم الفاتورة'] = { from: payment.invoice_number || '—', to: invoiceNumber || '—' }
  if ((payment.notes ?? '') !== (notes || '')) changes['ملاحظات'] = { from: payment.notes || '—', to: notes || '—' }
  if (payment.status !== finalStatus) {
    changes['الحالة'] = { from: PAYMENT_STATUS_LABELS[payment.status as keyof typeof PAYMENT_STATUS_LABELS] ?? payment.status, to: PAYMENT_STATUS_LABELS[finalStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? finalStatus }
  }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'تعديل بيانات دفعة',
    details: { payment_id: paymentId, changes },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// Sales engineer double-check: confirm invoice sent / client paid.
// Only the project's assigned sales engineer may toggle these.
export async function setSalesConfirmation(
  paymentId: string,
  projectId: string,
  field: 'sales_invoice_sent' | 'sales_payment_confirmed',
  value: boolean
) {
  if (field !== 'sales_invoice_sent' && field !== 'sales_payment_confirmed') {
    return { error: 'حقل غير صالح' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const service = createServiceClient()

  // Verify the user is the project's sales engineer
  const { data: project } = (await service
    .from('projects').select('sales_engineer_id').eq('id', projectId).single()) as unknown as {
      data: { sales_engineer_id: string | null } | null
    }
  if (!project || project.sales_engineer_id !== user.id) {
    return { error: 'هذا التأكيد متاح لمهندس المبيعات المسؤول فقط' }
  }

  const { error } = (await service
    .from('payments')
    .update({ [field]: value } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل حفظ التأكيد' }

  const label = field === 'sales_invoice_sent' ? 'إرسال الفاتورة للعميل' : 'استلام الدفع من العميل'
  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: `مهندس المبيعات: ${value ? 'تأكيد' : 'إلغاء تأكيد'} ${label}`,
    details: { payment_id: paymentId, field, value },
  } as never)

  // Notify the coordinator of the sales engineer's confirmation
  if (value) {
    const team = await projectTeam(service, projectId)
    await notify(team?.coordinator_id, {
      title: 'تأكيد من مهندس المبيعات',
      body: `${label} — مشروع «${team?.project_name ?? ''}»`,
      link: `/projects/${projectId}`, type: 'payment', projectId,
    }, user.id)
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function cancelPayment(paymentId: string, projectId: string) {
  const service = createServiceClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { error } = (await service
    .from('payments')
    .update({ status: 'cancelled' } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل إلغاء الدفعة' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'إلغاء دفعة',
    details: { payment_id: paymentId },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
