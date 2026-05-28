import { describe, it, expect } from 'vitest'
import {
  ROLE_LABELS,
  STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  INSTALLATION_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  ROLE_REDIRECTS,
} from '@/lib/constants'
import type {
  UserRole,
  ProjectStatus,
  PaymentType,
  PaymentStatus,
  InstallationStatus,
} from '@/types/database'

const ALL_ROLES: UserRole[] = ['coordinator', 'sales_engineer', 'installation', 'admin']
const ALL_PROJECT_STATUSES: ProjectStatus[] = ['active', 'completed', 'cancelled', 'on_hold']
const ALL_PAYMENT_TYPES: PaymentType[] = ['upfront', 'materials', 'installation', 'final', 'custom']
const ALL_PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'partial', 'paid', 'overdue', 'cancelled']
const ALL_INSTALLATION_STATUSES: InstallationStatus[] = [
  'scheduled', 'confirmed', 'in_progress', 'completed', 'delayed', 'rescheduled',
]

describe('ROLE_LABELS', () => {
  it('has an Arabic label for every role', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role], `Missing label for role: ${role}`).toBeTruthy()
      expect(typeof ROLE_LABELS[role]).toBe('string')
    }
  })

  it('labels are non-empty strings', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0)
    }
  })

  it('does not include supply role (removed)', () => {
    expect((ROLE_LABELS as Record<string, string>)['supply']).toBeUndefined()
  })
})

describe('STATUS_LABELS', () => {
  it('has a label for every project status', () => {
    for (const status of ALL_PROJECT_STATUSES) {
      expect(STATUS_LABELS[status], `Missing label for status: ${status}`).toBeTruthy()
    }
  })
})

describe('PAYMENT_TYPE_LABELS', () => {
  it('has a label for every payment type', () => {
    for (const type of ALL_PAYMENT_TYPES) {
      expect(PAYMENT_TYPE_LABELS[type], `Missing label for type: ${type}`).toBeTruthy()
    }
  })

  it('does not include supply type (renamed to materials)', () => {
    expect((PAYMENT_TYPE_LABELS as Record<string, string>)['supply']).toBeUndefined()
  })

  it('includes materials type', () => {
    expect(PAYMENT_TYPE_LABELS['materials']).toBeTruthy()
  })
})

describe('PAYMENT_STATUS_LABELS', () => {
  it('has a label for every payment status', () => {
    for (const status of ALL_PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[status], `Missing label for status: ${status}`).toBeTruthy()
    }
  })
})

describe('INSTALLATION_STATUS_LABELS', () => {
  it('has a label for every installation status', () => {
    for (const status of ALL_INSTALLATION_STATUSES) {
      expect(INSTALLATION_STATUS_LABELS[status], `Missing label for: ${status}`).toBeTruthy()
    }
  })
})

describe('DOCUMENT_TYPE_LABELS', () => {
  const expectedDocTypes = [
    'contract', 'invoice', 'receipt', 'delivery_note',
    'completion_photo', 'materials_request', 'other',
  ]

  it('has a label for every document type', () => {
    for (const type of expectedDocTypes) {
      expect(DOCUMENT_TYPE_LABELS[type], `Missing label for doc type: ${type}`).toBeTruthy()
    }
  })
})

describe('ROLE_REDIRECTS', () => {
  it('has a redirect for every role', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_REDIRECTS[role], `Missing redirect for role: ${role}`).toBeTruthy()
    }
  })

  it('coordinator redirects to /dashboard', () => {
    expect(ROLE_REDIRECTS.coordinator).toBe('/dashboard')
  })

  it('admin redirects to /dashboard', () => {
    expect(ROLE_REDIRECTS.admin).toBe('/dashboard')
  })

  it('installation redirects to /installation', () => {
    expect(ROLE_REDIRECTS.installation).toBe('/installation')
  })

  it('all redirect paths start with /', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_REDIRECTS[role]).toMatch(/^\//)
    }
  })
})
