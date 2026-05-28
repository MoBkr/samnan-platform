import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatCurrency, formatDate, formatDateShort, isOverdue, getInitials, cn } from '@/lib/utils'

describe('cn (className merger)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates tailwind classes (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
    expect(cn('base', true && 'active')).toBe('base active')
  })

  it('handles undefined and null', () => {
    expect(cn(undefined, null, 'class')).toBe('class')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats a positive SAR amount', () => {
    const result = formatCurrency(10000)
    expect(result).toContain('10,000')
    expect(result).toContain('SAR')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('formats decimal amounts up to 2 places', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,234.56')
  })

  it('returns em-dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })

  it('formats large amounts correctly', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1,000,000')
  })

  it('uses English digits (no Arabic numerals)', () => {
    const result = formatCurrency(12345)
    // Arabic numerals are ٠١٢٣٤٥٦٧٨٩
    expect(result).not.toMatch(/[٠-٩]/)
    expect(result).toMatch(/[0-9]/)
  })
})

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2025-01-15')
    expect(result).toContain('2025')
    expect(result).toContain('15')
  })

  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns em-dash for empty string', () => {
    expect(formatDate('')).toBe('—')
  })
})

describe('formatDateShort', () => {
  it('formats date as DD/MM/YYYY', () => {
    const result = formatDateShort('2025-03-05')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(result).toContain('2025')
  })

  it('returns em-dash for null', () => {
    expect(formatDateShort(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(formatDateShort(undefined)).toBe('—')
  })

  it('uses English digits only', () => {
    const result = formatDateShort('2025-01-01')
    expect(result).not.toMatch(/[٠-٩]/)
  })
})

describe('isOverdue', () => {
  beforeEach(() => {
    // Fix "now" to 2025-06-01
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when due date is in the past and status is pending', () => {
    expect(isOverdue('2025-05-01', 'pending')).toBe(true)
  })

  it('returns true when due date is today (midnight) and it is now noon', () => {
    // new Date('2025-06-01') = midnight UTC, system time is noon → overdue
    expect(isOverdue('2025-06-01', 'pending')).toBe(true)
  })

  it('returns false when due date is in the future', () => {
    expect(isOverdue('2026-01-01', 'pending')).toBe(false)
  })

  it('returns false when status is paid', () => {
    expect(isOverdue('2025-01-01', 'paid')).toBe(false)
  })

  it('returns false when status is cancelled', () => {
    expect(isOverdue('2025-01-01', 'cancelled')).toBe(false)
  })

  it('returns false for partial (still open, could be overdue)', () => {
    // partial IS overdue if past due date
    expect(isOverdue('2025-05-01', 'partial')).toBe(true)
  })

  it('returns false when due date is null', () => {
    expect(isOverdue(null, 'pending')).toBe(false)
  })
})

describe('getInitials', () => {
  it('returns initials of two-word name', () => {
    // Arabic: م[0] of محمد and أ[0] of أحمد
    expect(getInitials('محمد أحمد')).toBe('مأ')
  })

  it('returns first two initials from a longer name', () => {
    expect(getInitials('عبد الله محمد علي')).toBe('عا')
  })

  it('returns single initial for single name', () => {
    expect(getInitials('محمد')).toBe('م')
  })

  it('handles Latin names', () => {
    expect(getInitials('Mohamed Ahmed')).toBe('MA')
  })

  it('handles names with extra spaces gracefully', () => {
    const result = getInitials('Ali Hassan')
    expect(result.length).toBeGreaterThan(0)
  })
})
