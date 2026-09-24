import { expect, test as base, type Page } from '@playwright/test'

/** Data fixa para os testes (meio-dia em São Paulo). */
export const TODAY = '2026-09-15'

/**
 * Desloca apenas o `Date` para a data de teste; o tempo continua correndo e
 * `performance.now`/`requestAnimationFrame` ficam intactos (o relógio falso do
 * Playwright dessincroniza o rAF entre navegações e trava animações).
 */
async function pinDate(page: Page, iso: string) {
  await page.addInitScript((target: number) => {
    const RealDate = Date
    const offset = target - RealDate.now()
    class PinnedDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor> | []) {
        if (args.length === 0) super(RealDate.now() + offset)
        else super(...(args as ConstructorParameters<DateConstructor>))
      }
      static override now() {
        return RealDate.now() + offset
      }
    }
    globalThis.Date = PinnedDate as DateConstructor
  }, new Date(iso).getTime())
}

/**
 * Teste base: fixa a data, captura erros e avisos do console e falha
 * se qualquer um aparecer.
 */
export const test = base.extend<{ consoleProblems: string[] }>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`[${msg.type()}] ${msg.text()}`)
      })
      page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`))
      await pinDate(page, `${TODAY}T12:00:00-03:00`)
      await use(problems)
      expect(problems, 'O console deve ficar limpo').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** O conteúdo da página terminou a animação de entrada (opacidade 1). */
export async function expectPageVisible(page: Page) {
  await expect(page.locator('#conteudo > div > div').first()).toHaveCSS('opacity', '1')
}

export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 1024
}

export async function createClient(page: Page, name: string, extra: { email?: string; company?: string } = {}) {
  await page.goto('/clientes')
  await page.getByRole('button', { name: 'Novo cliente' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Novo cliente' })
  await dialog.getByLabel('Nome', { exact: true }).fill(name)
  if (extra.company) await dialog.getByLabel('Empresa').fill(extra.company)
  if (extra.email) await dialog.getByLabel('E-mail').fill(extra.email)
  await dialog.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

/** Cria uma venda parcelada em N vezes a partir de `firstDue`. */
export async function createSale(
  page: Page,
  opts: {
    client: string
    title: string
    total: string
    installments?: number
    firstDue?: string
    type?: string
    newClient?: boolean
  },
) {
  await page.goto('/vendas?nova=1')
  const dialog = page.getByRole('dialog', { name: 'Nova venda' })
  await expect(dialog).toBeVisible()
  if (opts.newClient) {
    await dialog.getByLabel('Cliente', { exact: true }).selectOption({ label: '+ Cadastrar novo cliente' })
    await dialog.getByLabel('Nome', { exact: true }).fill(opts.client)
  } else {
    await dialog.getByLabel('Cliente', { exact: true }).selectOption({ label: opts.client })
  }
  await dialog.getByLabel('Projeto', { exact: true }).fill(opts.title)
  if (opts.type) await dialog.getByLabel('Tipo de serviço').selectOption({ label: opts.type })
  await dialog.getByLabel('Valor total').fill(opts.total)
  if (opts.installments && opts.installments > 1) {
    await dialog.getByRole('radio', { name: 'Parcelado' }).click()
    await dialog.getByLabel('Número de parcelas').selectOption(String(opts.installments))
    if (opts.firstDue) await dialog.getByLabel('1º vencimento').fill(opts.firstDue)
  } else if (opts.firstDue) {
    await dialog.getByLabel('Vencimento', { exact: true }).fill(opts.firstDue)
  }
  await dialog.getByRole('button', { name: 'Salvar venda' }).click()
  await expect(page.getByRole('dialog', { name: opts.title })).toBeVisible()
}
