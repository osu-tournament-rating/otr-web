import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command:
      'NEXT_PUBLIC_APP_BASE_URL=http://localhost:3001 E2E_TEST_AUTH=true bun run build && E2E_TEST_AUTH=true bun run start -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Disable time-based gating for the suite; the maintenance-window spec
    // forces the window per-request via the `x-e2e-maintenance-window` header,
    // which takes precedence over this flag.
    env: { E2E_TEST_AUTH: 'true', MAINTENANCE_WINDOW_ENABLED: 'false' },
  },
});
