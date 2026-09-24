import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test'

/**
 * Testa o aplicativo desktop (Electron) com a build de produção em dist/.
 * Cada teste usa uma pasta de dados própria, apagada no fim.
 */
const root = path.resolve(import.meta.dirname, '..')
let userData = ''

async function launch(): Promise<ElectronApplication> {
  const args = [root, `--user-data-dir=${userData}`]
  if (process.platform === 'linux' && process.getuid?.() === 0) args.unshift('--no-sandbox')
  return electron.launch({ args, cwd: root })
}

test.beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), 'nexora-desktop-'))
})

test.afterEach(() => {
  rmSync(userData, { recursive: true, force: true })
})

test('abre, salva dados no computador e mantém ao reabrir', async () => {
  let app = await launch()
  let win = await app.firstWindow()
  const problems: string[] = []
  win.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
  })
  win.on('pageerror', (e) => problems.push(e.message))

  await expect(win.getByText('Tudo pronto para começar')).toBeVisible()
  await expect(win).toHaveTitle('Visão geral · NEXORA')
  expect(await win.evaluate(() => location.href)).toBe('app://nexora/')

  await win.getByRole('link', { name: 'Configurações' }).click()
  await expect(win.getByTestId('credit')).toHaveText('Criado Por Pedro Lucas!')
  await expect(win.getByTestId('storage-summary')).toContainText('Salvos neste computador')
  await win.getByLabel('Nome da empresa').fill('NEXORA')
  await win.getByRole('button', { name: 'Salvar' }).click()
  await expect(win.getByText('Configurações salvas')).toBeVisible()

  await win.getByRole('link', { name: 'Clientes' }).click()
  await win.getByRole('button', { name: 'Novo cliente' }).first().click()
  await win.getByRole('dialog', { name: 'Novo cliente' }).getByLabel('Nome', { exact: true }).fill('Padaria Aurora')
  await win.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(win.getByRole('heading', { level: 1, name: 'Padaria Aurora' })).toBeVisible()

  // Recarregar numa rota interna continua funcionando (o protocolo serve o index.html).
  await win.reload()
  await expect(win.getByRole('heading', { level: 1, name: 'Padaria Aurora' })).toBeVisible()
  expect(problems).toEqual([])
  await app.close()

  // Reabre com a mesma pasta de dados: tudo continua lá.
  app = await launch()
  win = await app.firstWindow()
  await expect(win.getByRole('heading', { level: 1 })).toHaveText('Olá, NEXORA')
  await win.getByRole('link', { name: 'Clientes' }).click()
  await expect(win.getByRole('list', { name: 'Clientes' })).toContainText('Padaria Aurora')
  await expect(win.getByText('Criado Por Pedro Lucas!').first()).toBeVisible()
  await app.close()
})

test('links externos não abrem dentro do aplicativo', async () => {
  const app = await launch()
  const win = await app.firstWindow()
  await expect(win.getByText('Tudo pronto para começar')).toBeVisible()
  await win.evaluate(() => {
    location.href = 'https://example.com/'
  })
  await win.waitForTimeout(500)
  expect(await win.evaluate(() => location.origin)).toBe('app://nexora')
  expect(app.windows()).toHaveLength(1)
  await app.close()
})
