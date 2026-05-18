'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
    .lt('due_date', today)
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
    .select('status, paid_amount')
    .eq('id', paymentId)
    .single()) as unknown as { data: { status: string; paid_amount: number } | null }

  if (!payment) return { error: 'الدفعة غير موجودة' }
  if (payment.status === 'paid') return { error: 'لا يمكن تعديل دفعة مؤكدة الدفع' }
  if (amount < payment.paid_amount) return { error: 'المبلغ الجديد لا يمكن أن يكون أقل من المبلغ المحصّل' }

  const { error } = (await service
    .from('payments')
    .update({
      amount,
      due_date: dueDate || null,
      notes: notes || null,
    } as never)
    .eq('id', paymentId)) as unknown as { error: Error | null }

  if (error) return { error: 'فشل تعديل الدفعة' }

  await service.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action: 'تعديل دفعة',
    details: { payment_id: paymentId, amount },
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
