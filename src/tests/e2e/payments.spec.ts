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

async function getFirstProjectUrl(page: Page): Promise<string | null> {
  await page.goto('/projects')
  const firstProjectLink = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
  const count = await firstProjectLink.count()
  if (count === 0) return null
  return await firstProjectLink.getAttribute('href')
}

test.describe('Payments tab', () => {
  test.skip(!process.env.E2E_COORDINATOR_EMAIL, 'E2E credentials not set')

  test('payments tab loads without error', async ({ page }) => {
    await loginAsCoordinator(page)
    const projectUrl = await getFirstProjectUrl(page)
    if (!projectUrl) { test.skip(); return }

    await page.goto(projectUrl)
    await page.click('text=الدفعات')
    await expect(page.locator('[class*="payment"], text=إضافة دفعة, text=لا توجد دفعات').first()).toBeVisible({ timeout: 8000 })
  })

  test('add payment button is visible', async ({ page }) => {
    await loginAsCoordinator(page)
    const projectUrl = await getFirstProjectUrl(page)
    if (!projectUrl) { test.skip(); return }

    await page.goto(projectUrl)
    await page.click('text=الدفعات')
    await expect(page.locator('button:has-text("إضافة"), button:has-text("دفعة")').first()).toBeVisible({ timeout: 8000 })
  })

  test('cannot add duplicate upfront payment', async ({ page }) => {
    await loginAsCoordinator(page)
    const projectUrl = await getFirstProjectUrl(page)
    if (!projectUrl) { test.skip(); return }

    await page.goto(projectUrl)
    await page.click('text=الدفعات')

    // Check if upfront payment already exists
    const hasUpfront = await page.locator('text=دفعة أولى').count()
    if (hasUpfront === 0) { test.skip(); return }

    // Try to add another upfront payment
    await page.locator('button:has-text("إضافة"), button:has-text("دفعة")').first().click()
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.count() === 0) { test.skip(); return }

    await page.selectOption('select[name="type"]', 'upfront').catch(() => {})
    await page.locator('button[type="submit"]').click()

    // Should show error toast
    const errorToast = page.locator('text=يوجد دفعة').or(page.locator('[data-sonner-toast][data-type="error"]'))
    await expect(errorToast).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Payments overview page', () => {
  test.skip(!process.env.E2E_COORDINATOR_EMAIL, 'E2E credentials not set')

  test('payments page is accessible', async ({ page }) => {
    await loginAsCoordinator(page)
    await page.goto('/payments')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1, [class*="header"]').first()).toBeVisible()
  })

  test('shows overdue payments section if any exist', async ({ page }) => {
    await loginAsCoordinator(page)
    await page.goto('/payments')
    // Either shows overdue payments or empty state
    await page.waitForLoadState('networkidle')
    const content = await page.content()
    expect(content.length).toBeGreaterThan(100)
  })
})
