const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.BASE_URL || 'https://eduflow-bangladesh.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
});
