import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Payment } from '@/types/database'

// ─── Payment business logic (extracted from payments-tab for testing) ────────

function computePaymentProgress(payments: Payment[]) {
  const total = payments.reduce((s, p) => s + p.amount, 0)
  const collected = payments.reduce((s, p) => s + p.paid_amount, 0)
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0
  return { total, collected, pct }
}

function isDuplicateType(payments: Payment[], type: string): boolean {
  if (type === 'custom') return false
  const used = new Set(
    payments
      .filter((p) => p.status !== 'cancelled' && p.type !== 'custom')
      .map((p) => p.type)
  )
  return used.has(type as never)
}

function canRecordPayment(payment: Payment, newAmount: number): { ok: boolean; error?: string } {
  const remaining = payment.amount - payment.paid_amount
  if (newAmount <= 0) return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر' }
  if (newAmount > remaining) return { ok: false, error: `يتجاوز المتبقي (${remaining})` }
  return { ok: true }
}

function computeNewPaymentStatus(payment: { amount: number; paid_amount: number }, addedAmount: number) {
  const newPaid = payment.paid_amount + addedAmount
  return newPaid >= payment.amount ? 'paid' : 'partial'
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'p1',
  project_id: 'proj1',
  type: 'upfront',
  name: null,
  order_no: null,
  invoice_number: null,
  invoice_date: null,
  seller_name: null,
  customer_account: null,
  sales_invoice_sent: false,
  sales_payment_confirmed: false,
  percentage: null,
  amount: 10000,
  due_date: null,
  status: 'pending',
  paid_amount: 0,
  paid_at: null,
  receipt_url: null,
  notes: null,
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('Payment progress calculation', () => {
  it('computes 0% when nothing paid', () => {
    const payments = [makePayment({ amount: 10000, paid_amount: 0 })]
    expect(computePaymentProgress(payments).pct).toBe(0)
  })

  it('computes 50% when half paid', () => {
    const payments = [makePayment({ amount: 10000, paid_amount: 5000 })]
    expect(computePaymentProgress(payments).pct).toBe(50)
  })

  it('computes 100% when fully paid', () => {
    const payments = [makePayment({ amount: 10000, paid_amount: 10000 })]
    expect(computePaymentProgress(payments).pct).toBe(100)
  })

  it('aggregates multiple payments', () => {
    const payments = [
      makePayment({ amount: 5000, paid_amount: 5000 }),
      makePayment({ amount: 5000, paid_amount: 2500, type: 'installation' }),
    ]
    const { total, collected, pct } = computePaymentProgress(payments)
    expect(total).toBe(10000)
    expect(collected).toBe(7500)
    expect(pct).toBe(75)
  })

  it('returns 0% when no payments', () => {
    expect(computePaymentProgress([]).pct).toBe(0)
    expect(computePaymentProgress([]).total).toBe(0)
  })
})

describe('Duplicate payment type detection', () => {
  it('blocks adding a second upfront payment', () => {
    const payments = [makePayment({ type: 'upfront', status: 'pending' })]
    expect(isDuplicateType(payments, 'upfront')).toBe(true)
  })

  it('allows adding upfront if existing is cancelled', () => {
    const payments = [makePayment({ type: 'upfront', status: 'cancelled' })]
    expect(isDuplicateType(payments, 'upfront')).toBe(false)
  })

  it('allows multiple custom payments', () => {
    const payments = [makePayment({ type: 'custom', status: 'pending' })]
    expect(isDuplicateType(payments, 'custom')).toBe(false)
  })

  it('allows adding materials if none exists', () => {
    const payments = [makePayment({ type: 'upfront', status: 'paid' })]
    expect(isDuplicateType(payments, 'materials')).toBe(false)
  })

  it('blocks adding second materials payment', () => {
    const payments = [
      makePayment({ type: 'upfront', status: 'paid' }),
      makePayment({ type: 'materials', status: 'partial', id: 'p2' }),
    ]
    expect(isDuplicateType(payments, 'materials')).toBe(true)
  })

  it('blocks adding final if paid final exists', () => {
    const payments = [makePayment({ type: 'final', status: 'paid' })]
    expect(isDuplicateType(payments, 'final')).toBe(true)
  })
})

describe('canRecordPayment validation', () => {
  it('rejects zero amount', () => {
    const p = makePayment({ amount: 10000, paid_amount: 0 })
    expect(canRecordPayment(p, 0).ok).toBe(false)
  })

  it('rejects negative amount', () => {
    const p = makePayment({ amount: 10000, paid_amount: 0 })
    expect(canRecordPayment(p, -100).ok).toBe(false)
  })

  it('rejects amount exceeding remaining', () => {
    const p = makePayment({ amount: 10000, paid_amount: 8000 })
    const result = canRecordPayment(p, 3000)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('2000')
  })

  it('accepts exact remaining amount', () => {
    const p = makePayment({ amount: 10000, paid_amount: 8000 })
    expect(canRecordPayment(p, 2000).ok).toBe(true)
  })

  it('accepts partial payment', () => {
    const p = makePayment({ amount: 10000, paid_amount: 0 })
    expect(canRecordPayment(p, 5000).ok).toBe(true)
  })
})

describe('Payment status after recording', () => {
  it('becomes paid when full amount is recorded', () => {
    expect(computeNewPaymentStatus({ amount: 10000, paid_amount: 0 }, 10000)).toBe('paid')
  })

  it('becomes partial when only part is recorded', () => {
    expect(computeNewPaymentStatus({ amount: 10000, paid_amount: 0 }, 5000)).toBe('partial')
  })

  it('becomes paid when remaining balance is cleared', () => {
    expect(computeNewPaymentStatus({ amount: 10000, paid_amount: 7000 }, 3000)).toBe('paid')
  })

  it('stays partial if not fully cleared', () => {
    expect(computeNewPaymentStatus({ amount: 10000, paid_amount: 7000 }, 2999)).toBe('partial')
  })
})

// ─── Project closure validation ───────────────────────────────────────────────

function canCloseProject(payments: Payment[]): { ok: boolean; reason?: string } {
  const blocking = payments.filter(
    (p) => p.status === 'pending' || p.status === 'partial'
  )
  if (blocking.length > 0) {
    return { ok: false, reason: `${blocking.length} دفعة غير مكتملة` }
  }
  return { ok: true }
}

describe('Project closure validation', () => {
  it('allows closure when all payments are paid', () => {
    const payments = [
      makePayment({ status: 'paid', paid_amount: 10000 }),
      makePayment({ type: 'final', status: 'paid', paid_amount: 5000, id: 'p2' }),
    ]
    expect(canCloseProject(payments).ok).toBe(true)
  })

  it('blocks closure if any payment is pending', () => {
    const payments = [
      makePayment({ status: 'paid', paid_amount: 10000 }),
      makePayment({ type: 'final', status: 'pending', id: 'p2' }),
    ]
    const result = canCloseProject(payments)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('1')
  })

  it('blocks closure if any payment is partial', () => {
    const payments = [makePayment({ status: 'partial', paid_amount: 5000 })]
    expect(canCloseProject(payments).ok).toBe(false)
  })

  it('allows closure if remaining payments are cancelled', () => {
    const payments = [
      makePayment({ status: 'paid', paid_amount: 10000 }),
      makePayment({ type: 'final', status: 'cancelled', id: 'p2' }),
    ]
    expect(canCloseProject(payments).ok).toBe(true)
  })

  it('allows closure with no payments', () => {
    expect(canCloseProject([]).ok).toBe(true)
  })
})

// ─── File validation ──────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function validateAttachment(file: { size: number; type: string }): { ok: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: 'حجم الملف يتجاوز 10 ميجابايت' }
  if (!ALLOWED_MIMES.includes(file.type)) return { ok: false, error: 'صيغة الملف غير مدعومة' }
  return { ok: true }
}

describe('File attachment validation', () => {
  it('accepts valid PDF', () => {
    expect(validateAttachment({ size: 1024 * 1024, type: 'application/pdf' }).ok).toBe(true)
  })

  it('accepts valid JPEG image', () => {
    expect(validateAttachment({ size: 500 * 1024, type: 'image/jpeg' }).ok).toBe(true)
  })

  it('accepts valid PNG image', () => {
    expect(validateAttachment({ size: 500 * 1024, type: 'image/png' }).ok).toBe(true)
  })

  it('accepts valid WebP image', () => {
    expect(validateAttachment({ size: 500 * 1024, type: 'image/webp' }).ok).toBe(true)
  })

  it('rejects oversized file', () => {
    const result = validateAttachment({ size: 11 * 1024 * 1024, type: 'application/pdf' })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('10')
  })

  it('rejects exactly at the limit + 1 byte', () => {
    const result = validateAttachment({ size: MAX_FILE_SIZE + 1, type: 'image/jpeg' })
    expect(result.ok).toBe(false)
  })

  it('accepts exactly at the size limit', () => {
    expect(validateAttachment({ size: MAX_FILE_SIZE, type: 'image/jpeg' }).ok).toBe(true)
  })

  it('rejects unsupported file types', () => {
    for (const type of ['video/mp4', 'application/zip', 'text/csv', 'application/msword']) {
      expect(validateAttachment({ size: 100, type }).ok).toBe(false)
    }
  })

  it('rejects executable files', () => {
    expect(validateAttachment({ size: 100, type: 'application/octet-stream' }).ok).toBe(false)
  })
})
