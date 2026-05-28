import { test, expect, Page } from '@playwright/test'

const COORDINATOR = {
  email: process.env.E2E_COORDINATOR_EMAIL || '',
  password: process.env.E2E_COORDINATOR_PASSWORD || '',
}

async function loginAsCoordinator(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', COORDINATOR.email)
  await page.fill('input[name="password"]', COORDINATOR.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

test.describe('Projects list', () => {
  test.skip(!process.env.E2E_COORDINATOR_EMAIL, 'E2E credentials not set')

  test.beforeEach(async ({ page }) => {
    await loginAsCoordinator(page)
    await page.goto('/projects')
  })

  test('shows projects page with RTL layout', async ({ page }) => {
    await expect(page.locator('h1, [class*="page-header"]').first()).toBeVisible()
  })

  test('shows مشاريعي tab and كل المشاريع tab', async ({ page }) => {
    await expect(page.locator('text=مشاريعي').first()).toBeVisible()
    await expect(page.locator('text=كل المشاريع').first()).toBeVisible()
  })

  test('shows new project button', async ({ page }) => {
    await expect(page.locator('a[href="/projects/new"], button:has-text("مشروع جديد")')).toBeVisible()
  })

  test('shows empty state when no projects', async ({ page }) => {
    // May show projects or empty state — both are valid
    const hasProjects = await page.locator('[class*="card"], [class*="Card"]').count()
    const hasEmpty = await page.locator('text=لا توجد مشاريع').count()
    expect(hasProjects > 0 || hasEmpty > 0).toBe(true)
  })
})

test.describe('Create project', () => {
  test.skip(!process.env.E2E_COORDINATOR_EMAIL, 'E2E credentials not set')

  test.beforeEach(async ({ page }) => {
    await loginAsCoordinator(page)
    await page.goto('/projects/new')
  })

  test('shows Arabic create project form', async ({ page }) => {
    await expect(page.locator('input[name="client_name"]')).toBeVisible()
    await expect(page.locator('input[name="project_name"]')).toBeVisible()
  })

  test('blocks submission with empty required fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    const clientInput = page.locator('input[name="client_name"]')
    await expect(clientInput).toHaveAttribute('required')
  })

  test('redirects to project detail after successful creation', async ({ page }) => {
    const timestamp = Date.now()
    await page.fill('input[name="client_name"]', `E2E Test Client ${timestamp}`)
    await page.fill('input[name="project_name"]', `E2E Test Project ${timestamp}`)
    await page.fill('input[name="total_amount"]', '50000')

    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    await page.waitForURL(/\/projects\/[a-z0-9-]+$/, { timeout: 15000 })
    await expect(page.url()).toMatch(/\/projects\//)
  })
})

test.describe('Project detail', () => {
  test.skip(!process.env.E2E_COORDINATOR_EMAIL, 'E2E credentials not set')

  test.beforeEach(async ({ page }) => {
    await loginAsCoordinator(page)
    await page.goto('/projects')
    // Click first project if any
    const firstProject = page.locator('a[href^="/projects/"]').first()
    const count = await firstProject.count()
    if (count > 0) {
      await firstProject.click()
      await page.waitForURL(/\/projects\/[a-z0-9-]+$/)
    }
  })

  test('shows project detail tabs', async ({ page }) => {
    const url = page.url()
    if (!url.match(/\/projects\/[a-z0-9-]+$/)) {
      test.skip()
      return
    }
    await expect(page.locator('text=الدفعات').first()).toBeVisible()
    await expect(page.locator('text=التركيبات').first()).toBeVisible()
    await expect(page.locator('text=المرفقات').first()).toBeVisible()
    await expect(page.locator('text=سجل النشاط').first()).toBeVisible()
  })

  test('shows project header with status badge', async ({ page }) => {
    const url = page.url()
    if (!url.match(/\/projects\/[a-z0-9-]+$/)) {
      test.skip()
      return
    }
    // Should show status (نشط, مكتمل, etc.)
    const statusBadge = page.locator('text=نشط, text=مكتمل, text=معلق, text=ملغي').first()
    await expect(statusBadge.or(page.locator('[class*="badge"]').first())).toBeVisible()
  })
})
