import { test, expect, Page } from '@playwright/test'

const USERS = {
  coordinator: {
    email: process.env.E2E_COORDINATOR_EMAIL || '',
    password: process.env.E2E_COORDINATOR_PASSWORD || '',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || '',
    password: process.env.E2E_ADMIN_PASSWORD || '',
  },
  installation: {
    email: process.env.E2E_INSTALLATION_EMAIL || '',
    password: process.env.E2E_INSTALLATION_PASSWORD || '',
  },
}

async function login(page: Page, role: keyof typeof USERS) {
  await page.goto('/login')
  await page.fill('input[name="email"]', USERS[role].email)
  await page.fill('input[name="password"]', USERS[role].password)
  await page.click('button[type="submit"]')
}

// ─── Public routes ─────────────────────────────────────────────────────────────

test.describe('Root redirect', () => {
  test('/ redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('login page has correct Arabic title', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('أهلاً بك')
  })
})

// ─── Coordinator dashboard ─────────────────────────────────────────────────────

test.describe('Coordinator dashboard', () => {
  test.skip(!process.env.E2E_COORDINATOR_EMAIL, 'E2E_COORDINATOR_EMAIL not set')

  test('shows dashboard after login', async ({ page }) => {
    await login(page, 'coordinator')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.locator('text=لوحة التحكم').first()).toBeVisible()
  })

  test('sidebar shows correct navigation items', async ({ page }) => {
    await login(page, 'coordinator')
    await page.waitForURL(/\/dashboard/)
    await expect(page.locator('text=المشاريع').first()).toBeVisible()
    await expect(page.locator('text=المدفوعات').first()).toBeVisible()
  })

  test('sidebar does NOT show Users Management for coordinator', async ({ page }) => {
    await login(page, 'coordinator')
    await page.waitForURL(/\/dashboard/)
    await expect(page.locator('text=إدارة المستخدمين')).toHaveCount(0)
  })

  test('coordinator cannot access /users', async ({ page }) => {
    await login(page, 'coordinator')
    await page.waitForURL(/\/dashboard/)
    await page.goto('/users')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 })
  })

  test('shows stats cards', async ({ page }) => {
    await login(page, 'coordinator')
    await page.waitForURL(/\/dashboard/)
    // Some numeric stat should appear
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    expect(content).toContain('مشروع')
  })
})

// ─── Admin dashboard ────────────────────────────────────────────────────────────

test.describe('Admin dashboard', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'E2E_ADMIN_EMAIL not set')

  test('admin sees Users Management in sidebar', async ({ page }) => {
    await login(page, 'admin')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.locator('text=إدارة المستخدمين')).toBeVisible()
  })

  test('admin can access /users', async ({ page }) => {
    await login(page, 'admin')
    await page.waitForURL(/\/dashboard/)
    await page.goto('/users')
    await expect(page).toHaveURL(/\/users/, { timeout: 8000 })
    await expect(page.locator('h1, text=المستخدمين').first()).toBeVisible()
  })

  test('admin can access /reports', async ({ page }) => {
    await login(page, 'admin')
    await page.waitForURL(/\/dashboard/)
    await page.goto('/reports')
    await expect(page).toHaveURL(/\/reports/, { timeout: 8000 })
  })
})

// ─── Installation role ─────────────────────────────────────────────────────────

test.describe('Installation role', () => {
  test.skip(!process.env.E2E_INSTALLATION_EMAIL, 'E2E_INSTALLATION_EMAIL not set')

  test('installation user lands on /installation', async ({ page }) => {
    await login(page, 'installation')
    await expect(page).toHaveURL(/\/installation/, { timeout: 10000 })
  })

  test('installation user cannot access /dashboard', async ({ page }) => {
    await login(page, 'installation')
    await page.waitForURL(/\/installation/)
    await page.goto('/dashboard')
    // Should redirect away from dashboard
    await page.waitForURL(/\/installation/, { timeout: 8000 })
  })

  test('installation user cannot access /users', async ({ page }) => {
    await login(page, 'installation')
    await page.waitForURL(/\/installation/)
    await page.goto('/users')
    await expect(page).not.toHaveURL(/\/users/, { timeout: 8000 })
  })
})

// ─── Mobile responsiveness ─────────────────────────────────────────────────────

test.describe('Mobile layout', () => {
  test('login page renders correctly on mobile', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('أهلاً بك')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('signup page renders correctly on mobile', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('h1')).toContainText('إنشاء حساب')
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})

// ─── Security ─────────────────────────────────────────────────────────────────

test.describe('Route protection', () => {
  const protectedRoutes = ['/dashboard', '/projects', '/payments', '/users', '/installation', '/reports']

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    })
  }
})
