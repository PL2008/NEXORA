import { expect, expectPageVisible, isMobile, test } from './fixtures'

const pages: Array<[string, RegExp | string]> = [
  ['/', 'Tudo pronto para começar'],
  ['/vendas', 'Nenhuma venda registrada'],
  ['/recebimentos', 'Nenhuma parcela ainda'],
  ['/despesas', 'Nenhuma despesa registrada'],
  ['/clientes', 'Nenhum cliente cadastrado'],
  ['/propostas', 'Pipeline vazio'],
  ['/contratos', 'Nenhum contrato recorrente'],
  ['/relatorios', /Nenhum lançamento em 2026/],
]

test('o sistema começa vazio, com estados vazios em todas as telas', async ({ page }) => {
  for (const [path, text] of pages) {
    await page.goto(path)
    await expect(page.getByText(text)).toBeVisible()
    await expectPageVisible(page)
  }
  await page.goto('/configuracoes')
  await expect(page.getByTestId('credit')).toHaveText('Criado Por Pedro Lucas!')
  await expect(page.getByTestId('storage-summary')).toContainText(
    '0 clientes · 0 vendas · 0 despesas · 0 contratos · 0 propostas',
  )
})

test('navegação principal funciona', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await nav.getByRole('link', { name: /Vendas/ }).click()
  await expect(page).toHaveURL(/\/vendas$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Vendas' })).toBeVisible()
  await expectPageVisible(page)
  if (isMobile(page)) {
    await nav.getByRole('button', { name: 'Mais' }).click()
    await page.getByRole('dialog', { name: 'Mais' }).getByRole('link', { name: 'Contratos' }).click()
  } else {
    await nav.getByRole('link', { name: 'Contratos' }).click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Contratos recorrentes' })).toBeVisible()
  await expectPageVisible(page)
  await page.goto('/rota-inexistente')
  await expect(page.getByText('Página não encontrada')).toBeVisible()
})

test('não há rolagem horizontal na página', async ({ page }) => {
  for (const path of ['/', '/vendas', '/propostas', '/relatorios', '/configuracoes']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0)
  }
})
