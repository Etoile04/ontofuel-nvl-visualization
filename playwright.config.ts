import { defineConfig, devices } from '@playwright/test';

/**
 * NFM-228 E2E configuration. Gate strategy = D1 Track B+ (QA Ruling 2):
 * webServer builds the real CRA production bundle, copies the canonical NVL
 * fixture into build/data/, and serves it statically on :3210. No dev server,
 * no Docker — deterministic CI merge gate. Docker/nginx is covered by the
 * nightly workflow (.github/workflows/e2e-nightly-nginx.yml, M-R1).
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Single app instance; keep serial to avoid races on the shared static server.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : 'list',
  outputDir: 'e2e/output',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `npm run build:e2e && npx serve build -l ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000
  }
});
