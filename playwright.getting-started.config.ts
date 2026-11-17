import { defineConfig, devices } from '@playwright/test';

// Follow-up to the auth-loading race in the existing browser suite.
// No provider calls, login submission, or production writes are performed.
export default defineConfig({
  testDir: './e2e',
  testMatch: '08-forms-interactions.spec.ts',
  grep: /(?:getting started|demo) offers unauthenticated users a working sign-in path/,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  reporter: [
    ['json', { outputFile: '/home/ubuntu/retest-evidence/pager-getting-started-followup.json' }],
    ['list'],
  ],
  outputDir: '/home/ubuntu/retest-evidence/pager-getting-started-followup-artifacts',
  use: { baseURL: 'http://127.0.0.1:3001', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
