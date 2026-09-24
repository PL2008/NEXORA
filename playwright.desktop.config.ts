import { defineConfig } from '@playwright/test'

/** Testes do aplicativo desktop (Electron). Rode `npm run build` antes. */
export default defineConfig({
  testDir: './e2e-desktop',
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
})
