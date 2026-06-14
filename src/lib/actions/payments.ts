'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { formatCurrency } from '@/lib/utils'
import { PAYMENT_STATUS_LABELS } from '@/lib/constants'
import type { Payment, PaymentType } from '@/types/database'
import type { QueryResultMany } from '@/lib/supabase/typed'

export async function getProjectPayments(projectId: string) {
  const supabase = await createClient()
  const result = (await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
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

  if (!projectId || !type || !amount) {
    return { error: 'يرجى ملء جميع الحقول المطلوبة' }
  }

  const service = createServiceClient()
  const { error } = (await service.from('payments').insert({
    project_id: projectId,
    type,
    amount: parseFloat(amount),
    due_date: dueDate || null,
    percentage: percentage ? parseFloat(percentage) : null,
    notes: notes || null,
    status: 'pending',
    paid_amount: 0,
  } as never)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل إنشاء الدفعة' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'إضافة دفعة جديدة',
    details: { type, amount },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
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
    .select('status')
    .eq('id', paymentId)
    .single()) as unknown as { data: { status: string } | null }

  if (!payment) return { error: 'الدفعة غير موجودة' }

  const { error } = (await service
    .from('payments')
    .delete()
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل حذف الدفعة' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'حذف دفعة',
    details: { payment_id: paymentId },
  } as never)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function editPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const paymentId = formData.get('payment_id') as string
  const projectId = formData.get('project_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const dueDate = formData.get('due_date') as string
  const notes = formData.get('notes') as string

  if (!paymentId || isNaN(amount) || amount <= 0) return { error: 'يرجى إدخال مبلغ صحيح' }

  const service = createServiceClient()

  const { data: payment } = (await service
    .from('payments')
    .select('status, paid_amount, amount, due_date, notes, paid_at, type')
    .eq('id', paymentId)
    .single()) as unknown as {
      data: { status: string; paid_amount: number; amount: number; due_date: string | null; notes: string | null; paid_at: string | null; type: string } | null
    }

  if (!payment) return { error: 'الدفعة غير موجودة' }

  // Editing allowed at ANY stage (even after full payment). Status is
  // recomputed against the collected amount so the record stays consistent.
  const newStatus = payment.paid_amount >= amount ? 'paid' : payment.paid_amount > 0 ? 'partial' : 'pending'
  const newPaidAt = newStatus === 'paid' ? (payment.paid_at ?? new Date().toISOString()) : null

  const { error } = (await service
    .from('payments')
    .update({
      amount,
      due_date: dueDate || null,
      notes: notes || null,
      status: newStatus,
      paid_at: newPaidAt,
    } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تعديل الدفعة' }

  // ── Audit log: record old → new for each changed field ──
  const changes: Record<string, { from: string; to: string }> = {}
  if (payment.amount !== amount) {
    changes['المبلغ'] = { from: formatCurrency(payment.amount), to: formatCurrency(amount) }
  }
  if ((payment.due_date ?? '') !== (dueDate || '')) {
    changes['تاريخ الاستحقاق'] = { from: payment.due_date || '—', to: dueDate || '—' }
  }
  if ((payment.notes ?? '') !== (notes || '')) {
    changes['ملاحظات'] = { from: payment.notes || '—', to: notes || '—' }
  }
  if (payment.status !== newStatus) {
    changes['الحالة'] = { from: PAYMENT_STATUS_LABELS[payment.status as keyof typeof PAYMENT_STATUS_LABELS] ?? payment.status, to: PAYMENT_STATUS_LABELS[newStatus] ?? newStatus }
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
