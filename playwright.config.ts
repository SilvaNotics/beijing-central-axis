import { defineConfig } from '@playwright/test';
import process from 'node:process';

const localProxyBypass = ['127.0.0.1', 'localhost'];
for (const key of ['NO_PROXY', 'no_proxy'] as const) {
  const entries = new Set((process.env[key] ?? '').split(',').map(item => item.trim()).filter(Boolean));
  localProxyBypass.forEach(entry => entries.add(entry));
  process.env[key] = [...entries].join(',');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // The headless software-WebGL runner needs more than 30s to build the full
  // city on cold pages and on the route transition into the flat map.
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
