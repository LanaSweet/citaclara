import { defineConfig } from '@playwright/test'
import { loadEnvFile } from 'node:process'

try { loadEnvFile('.env.local') } catch { /* sin archivo: se usan las variables del entorno */ }

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:3100', locale: 'es-ES', timezoneId: 'Europe/Madrid' },
  projects: [
    { name: 'movil', use: { viewport: { width: 360, height: 740 }, hasTouch: true } },
    { name: 'escritorio', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'pnpm dev --port 3100',
    url: 'http://localhost:3100/acceso',
    reuseExistingServer: !process.env.CI,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? '', SESION_SECRETO: process.env.SESION_SECRETO ?? '' },
  },
})
