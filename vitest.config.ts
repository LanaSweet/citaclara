import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { loadEnvFile } from 'node:process'

try {
  loadEnvFile('.env.local')
} catch {
  /* sin archivo: se usan las variables del entorno (CI) */
}

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/{dominio,servicios,bd,semilla}/**/*.test.ts'],
    // Los tests de servicios y BD comparten la BD de pruebas: sin paralelismo entre archivos.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
