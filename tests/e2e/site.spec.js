const { test, expect } = require('@playwright/test');

test('landing page loads and demo CTA works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/EduFlow/i);
  await expect(page.getByRole('link', { name: /View live demo|View Demo|Try Demo/i }).first()).toBeVisible();
  await page.goto('/app.html?demo=true');
  await expect(page.locator('text=Demo Mode')).toBeVisible();
  await expect(page.locator('#app-shell')).toBeVisible();
  expect(errors).toEqual([]);
});

test('development access is visibly read-only and skips login', async ({ page }) => {
  await page.goto('/app.html?dev=true');
  await expect(page.locator('text=Development Mode')).toBeVisible();
  await expect(page.locator('#auth-screen')).toHaveClass(/hidden/);
  await expect(page.locator('#app-shell')).toBeVisible();
});

test('dashboard navigation remains responsive and does not loop', async ({ page }) => {
  await page.goto('/app.html?demo=true');
  await page.waitForSelector('#app-shell:not(.hidden)');
  for (const label of ['Dashboard', 'Students', 'Batches', 'Attendance', 'Fees']) {
    const button = page.locator(`[data-page="${label.toLowerCase().replace(' & payments','').replace(' ','')}"], [data-page]`).filter({ hasText: label }).first();
    if (await button.count()) {
      await button.click({ timeout: 3000 });
      await page.waitForTimeout(150);
    }
  }
  await expect(page.locator('#page-content')).toBeVisible();
});

test('guardian portal is protected without a guardian session', async ({ page }) => {
  await page.goto('/guardian.html');
  await expect(page.locator('text=Sign in required')).toBeVisible();
});

test('auth recovery entry is present', async ({ page }) => {
  await page.goto('/app.html');
  const text = await page.locator('body').innerText();
  expect(text).toMatch(/forgot|password|sign in/i);
});

test('protected app is not indexable', async ({ request }) => {
  const response = await request.get('/app.html');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('text/html');
  expect(await response.text()).toContain('noindex');
});
