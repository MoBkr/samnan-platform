# Testing Patterns

**Analysis Date:** 2026-06-18

## Test Framework

**Runner:**
- Vitest 4.1.7
- Config: `vitest.config.ts`
- Environment: jsdom (for React component testing)

**Assertion Library:**
- Vitest's built-in `expect()` function (compatible with Jest)
- `@testing-library/react` for component testing
- `@testing-library/jest-dom` for DOM matchers

**Playwright:**
- E2E testing with @playwright/test 1.60.0
- For full-app integration and browser-based testing

**Run Commands:**
```bash
npm run test              # Run all unit tests once
npm run test:watch       # Watch mode (re-run on file changes)
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests
```

## Test File Organization

**Location:**
- Unit tests: `src/tests/unit/**/*.test.ts`
- E2E tests: `src/tests/e2e/**/*.spec.ts`
- Setup: `src/tests/setup.ts` (initializes @testing-library/jest-dom)

**Naming:**
- Unit test files: `.test.ts` suffix (e.g., `utils.test.ts`, `constants.test.ts`, `business-logic.test.ts`)
- E2E test files: `.spec.ts` suffix (e.g., `auth.spec.ts`, `projects.spec.ts`)

**Directory Structure:**
```
src/tests/
├── setup.ts                      # Vitest setup (imports jest-dom matchers)
├── unit/
│   ├── utils.test.ts            # Utility function tests
│   ├── constants.test.ts         # Constant coverage tests
│   └── business-logic.test.ts    # Payment logic, validation, project closure rules
└── e2e/
    ├── auth.spec.ts             # Login, signup, session flow
    ├── projects.spec.ts         # Project CRUD
    ├── payments.spec.ts         # Payment tracking flow
    └── dashboard.spec.ts        # Dashboard rendering per role
```

## Test Structure

**Suite Organization:**

Unit tests use `describe()` blocks to group related tests:
```typescript
describe('formatCurrency', () => {
  it('formats a positive SAR amount', () => {
    const result = formatCurrency(10000)
    expect(result).toContain('10,000')
    expect(result).toContain('SAR')
  })

  it('returns em-dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })
})
```

E2E tests organize by feature/page:
```typescript
test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('displays Arabic login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('أهلاً بك')
  })
})
```

**Patterns:**

**Setup/Teardown:**
- `beforeEach()` runs before each test in a describe block
- `afterEach()` runs after each test
- Used to set fake timers, reset mocks, navigate to pages
- Example from `utils.test.ts`:
  ```typescript
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })
  ```

**Assertion Patterns:**
- Use `expect()` for value comparisons: `expect(result).toBe(value)`, `expect(result).toEqual(obj)`
- Use `expect().toContain()` for substring/array membership
- Use `expect().toMatch()` for regex patterns
- Use `expect().toBeVisible()` for Playwright DOM visibility

**Test Data Factories:**
- Defined within test files as helper functions
- Example from `business-logic.test.ts`:
  ```typescript
  const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'p1',
    project_id: 'proj1',
    type: 'upfront',
    amount: 10000,
    paid_amount: 0,
    status: 'pending',
    // ... other fields
    ...overrides,
  })
  ```
  Used to quickly create test objects:
  ```typescript
  it('computes 50% when half paid', () => {
    const payments = [makePayment({ amount: 10000, paid_amount: 5000 })]
    expect(computePaymentProgress(payments).pct).toBe(50)
  })
  ```

## Mocking

**Framework:**
- Vitest's `vi` module (similar to Jest)
- `@testing-library/user-event` for simulating user interactions in Playwright

**Patterns:**

**Fake Timers:**
```typescript
vi.useFakeTimers()
vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
// ... assertions
vi.useRealTimers()
```

**Spies (less common in unit tests, used when needed):**
```typescript
const spy = vi.fn()
spy(arg)
expect(spy).toHaveBeenCalledWith(arg)
```

**What to Mock:**
- System time (via `vi.useFakeTimers()`) for date-dependent logic
- Supabase client calls (in integration tests, not shown in this codebase)
- External API calls (in E2E tests, usually stubbed via Playwright)

**What NOT to Mock:**
- Pure utility functions (e.g., `formatCurrency`, `getInitials`)
- DOM APIs that testing-library can handle
- Business logic functions (want to test actual behavior)

## Fixtures and Factories

**Test Data:**

Factories defined inline in test files. No shared fixture library found.

Example from `business-logic.test.ts`:
```typescript
const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  // ... default values
  ...overrides,
})

// Usage:
const payment = makePayment({ amount: 5000, status: 'paid' })
```

Enum test data arrays:
```typescript
const ALL_ROLES: UserRole[] = ['coordinator', 'sales_engineer', 'installation', 'admin']
const ALL_PROJECT_STATUSES: ProjectStatus[] = ['active', 'completed', 'cancelled', 'on_hold']

describe('ROLE_LABELS', () => {
  it('has a label for every role', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })
})
```

**Location:**
- Factories defined inline in test files
- No `fixtures/` or `factories/` directory
- Constants for test data arrays defined at top of test file

## Coverage

**Requirements:**
- No explicit coverage target enforced
- Config specifies: `provider: 'v8'`
- Include: `src/lib/**/*.ts`, `src/components/**/*.tsx`
- Exclude: `src/lib/supabase/**/*`, `src/tests/**/*`

**View Coverage:**
```bash
npm run test:coverage
# Generates HTML report in coverage/
```

**Current State:**
- Unit tests written for: utilities (`utils.ts`), constants, and core business logic (payments, validation)
- Component tests: minimal (no .test.tsx files found)
- E2E tests: cover auth, projects, payments, dashboards

## Test Types

**Unit Tests:**
- Scope: Pure functions, utilities, business logic
- Approach: Fast, no external dependencies, deterministic
- Examples: `utils.test.ts` (date/currency formatting), `business-logic.test.ts` (payment calculations, validation rules, project closure)
- Typically 5–20 assertions per test

**Integration Tests:**
- Scope: Server actions with Supabase (not shown as `.test.ts`, likely manual or in E2E)
- Approach: Would use test database or mocked Supabase client
- Not found in current codebase — integration via E2E or manual testing

**E2E Tests:**
- Framework: Playwright
- Scope: Full user flows through the browser
- Approach: Real app, real Supabase account (via env vars)
- Tests: Auth flows, project CRUD, payment tracking, dashboard rendering
- Uses environment variables for test credentials:
  ```typescript
  const TEST_USERS = {
    coordinator: {
      email: process.env.E2E_COORDINATOR_EMAIL || '',
      password: process.env.E2E_COORDINATOR_PASSWORD || '',
      redirectTo: '/dashboard',
    },
    // ...
  }
  ```

## Common Patterns

**Async Testing:**

Vitest automatically detects async tests if function is `async`:
```typescript
test('async function works', async () => {
  const result = await someAsyncFunction()
  expect(result).toBe(expected)
})
```

Playwright uses `async` test functions:
```typescript
test('redirects to dashboard after login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

**Error Testing:**

Validation functions return `{ ok: boolean; error?: string }`:
```typescript
describe('canRecordPayment validation', () => {
  it('rejects amount exceeding remaining', () => {
    const p = makePayment({ amount: 10000, paid_amount: 8000 })
    const result = canRecordPayment(p, 3000)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('2000')
  })

  it('accepts partial payment', () => {
    const p = makePayment({ amount: 10000, paid_amount: 0 })
    expect(canRecordPayment(p, 5000).ok).toBe(true)
  })
})
```

**Enumeration Testing:**

Verify all enum values have corresponding labels:
```typescript
describe('PAYMENT_STATUS_LABELS', () => {
  const ALL_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'cancelled']

  it('has a label for every payment status', () => {
    for (const status of ALL_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[status]).toBeTruthy()
    }
  })
})
```

Prevents bugs when adding new enum values and forgetting corresponding labels.

**Boundary Testing:**

Tests at and beyond limits:
```typescript
describe('File attachment validation', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  it('accepts exactly at the size limit', () => {
    expect(validateAttachment({ size: MAX_FILE_SIZE, type: 'image/jpeg' }).ok).toBe(true)
  })

  it('rejects exactly at the limit + 1 byte', () => {
    const result = validateAttachment({ size: MAX_FILE_SIZE + 1, type: 'image/jpeg' })
    expect(result.ok).toBe(false)
  })

  it('rejects oversized file', () => {
    const result = validateAttachment({ size: 11 * 1024 * 1024, type: 'application/pdf' })
    expect(result.ok).toBe(false)
  })
})
```

---

*Testing analysis: 2026-06-18*
