import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',testMatch:'11-qa-regression.spec.ts',workers:1,fullyParallel:false,timeout:30000,
  reporter:[['json',{outputFile:'/home/ubuntu/retest-evidence/qa-e2e.json'}],['list']],
  outputDir:'/home/ubuntu/retest-evidence/qa-e2e-artifacts',
  use:{baseURL:'http://127.0.0.1:3001',screenshot:'only-on-failure'},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],
});
