import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:8123', channel: 'chrome', locale: 'cs-CZ', trace: 'retain-on-failure' },
  webServer: {
    command: 'bash e2e/server.sh',
    url: 'http://127.0.0.1:8123/api_frontend/ping',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    timeout: 120_000,
  },
});
