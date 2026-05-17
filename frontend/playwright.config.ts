import { defineConfig, devices } from '@playwright/test'

/**
 * Конфигурация Playwright для СнабЛаб E2E тестов
 *
 * Backend: http://localhost:8000
 * Frontend: http://localhost:5173
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // ── Timeouts ──────────────────────────────────────────
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // ── Parallelism ───────────────────────────────────────
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 2,
  workers: process.env.CI ? 1 : 2,

  // ── Reporting ─────────────────────────────────────────
  reporter: [
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ['list'],
  ],

  // ── Screenshots / Video ───────────────────────────────
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  // ── Projects ──────────────────────────────────────────
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  // ── Dev server (опционально) ─────────────────────────
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60_000,
  // },
})
