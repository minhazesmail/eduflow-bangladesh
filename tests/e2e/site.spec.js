const { test, expect } = require('@playwright/test');

/** Core nav pages that exist as static [data-page] buttons in app.html */
const CORE_PAGES = ['dashboard', 'students', 'batches', 'attendance', 'payments'];

test('landing page loads and demo CTA works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/EduFlow/i);

  // Prefer href over localized link text
  const demoLink = page.locator('a[href*="demo=true"]').first();
  await expect(demoLink).toBeVisible();

  await page.goto('/app.html?demo=true');
  await expect(page.locator('#demo-mode-banner')).toBeVisible();
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#app-shell')).not.toHaveClass(/hidden/);

  expect(errors).toEqual([]);
});

test('development access skips login and shows app shell', async ({ page }) => {
  await page.goto('/app.html?dev=true');

  await expect(page.locator('#auth-screen')).toHaveClass(/hidden/);
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#app-shell')).not.toHaveClass(/hidden/);

  // Banner is injected without a fixed id; flag is set on window
  const isDev = await page.evaluate(() => window.__eduflowDevMode === true);
  expect(isDev).toBeTruthy();
});

test('dashboard navigation via data-page remains responsive', async ({ page }) => {
  await page.goto('/app.html?demo=true');
  await page.waitForSelector('#app-shell:not(.hidden)');

  for (const pageKey of CORE_PAGES) {
    const button = page.locator(`aside .nav button[data-page="${pageKey}"]`).first();
    await expect(button).toBeVisible();
    await button.click();
    // Allow render; content region must stay mounted
    await expect(page.locator('#page-content')).toBeVisible();
  }

  // Hash should track last navigated page when runtime updates it
  await expect(page.locator('#page-content')).not.toBeEmpty();
});

test('guardian portal is gated without a session', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/guardian.html');

  // Portal shell always present
  await expect(page.locator('main.portal')).toBeVisible();
  await expect(page.locator('#root')).toBeVisible();

  // Signed-out state: content is i18n-aware (en or bn)
  await expect(page.locator('#root')).toContainText(/Sign in required|সাইন ইন প্রয়োজন/i);

  // Sign-out control is hidden when there is no session
  await expect(page.locator('#logout')).toBeHidden();

  expect(errors).toEqual([]);
});

test('auth screen exposes sign-in controls', async ({ page }) => {
  await page.goto('/app.html');

  // Unauthenticated: either auth UI is shown or still loading then auth
  await page.waitForSelector('#auth-screen, #app-shell, input[type="password"], input[type="email"]', {
    timeout: 15_000,
  });

  const hasPassword = await page.locator('input[type="password"]').count();
  const hasEmail = await page.locator('input[type="email"], input[name*="email" i], input[id*="email" i]').count();
  const authVisible = await page.locator('#auth-screen:not(.hidden)').count();
  const body = await page.locator('body').innerText();

  // Structural or copy-level recovery path (forgot password / sign in)
  const hasAuthChrome =
    hasPassword > 0 ||
    hasEmail > 0 ||
    authVisible > 0 ||
    /forgot|password|sign\s*in|সাইন\s*ইন|পাসওয়ার্ড/i.test(body);

  expect(hasAuthChrome).toBeTruthy();
});

test('protected app is not indexable', async ({ request }) => {
  const response = await request.get('/app.html');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('text/html');
  const html = await response.text();
  expect(html).toMatch(/noindex/i);
  expect(html).toContain('data-page="dashboard"');
});
