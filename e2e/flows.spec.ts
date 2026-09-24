import { readFile } from 'node:fs/promises'
import { createClient, createSale, expect, expectPageVisible, test } from './fixtures'

test('despesas: avulsa, recorrente mensal e visão por categoria', async ({ page }) => {
  await page.goto('/despesas')
  await page.getByRole('button', { name: 'Nova despesa' }).first().click()
  let dialog = page.getByRole('dialog', { name: 'Nova despesa' })
  await dialog.getByLabel('Descrição').fill('Assinatura Figma')
  await dialog.getByLabel('Categoria').selectOption({ label: 'Ferramentas e software' })
  await dialog.getByLabel('Valor').fill('25000')
  await dialog
    .getByLabel('Primeiro lançamento')
    .or(dialog.getByLabel('Data', { exact: true }))
    .fill('2026-07-05')
  await dialog.getByLabel(/Repetir todo mês/).check()
  await dialog.getByRole('button', { name: 'Salvar despesa' }).click()
  await expect(page.getByText('Despesa recorrente criada')).toBeVisible()

  await page.getByRole('button', { name: 'Nova despesa' }).first().click()
  dialog = page.getByRole('dialog', { name: 'Nova despesa' })
  await dialog.getByLabel('Descrição').fill('Anúncios')
  await dialog.getByLabel('Categoria').selectOption({ label: 'Marketing' })
  await dialog.getByLabel('Valor').fill('75000')
  await dialog.getByLabel('Data', { exact: true }).fill('2026-09-03')
  await dialog.getByRole('button', { name: 'Salvar despesa' }).click()

  await expect(page.getByRole('list', { name: 'Despesas do mês' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByText('R$ 1.000,00').first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Por categoria' })).toContainText('Marketing')
  await expect(page.getByRole('list', { name: 'Despesas recorrentes' })).toContainText('Assinatura Figma')

  // Lançamentos gerados em julho e agosto também.
  await page.getByRole('button', { name: 'Mês anterior' }).click()
  await expect(page.getByRole('heading', { name: 'agosto de 2026' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Despesas do mês' })).toContainText('Assinatura Figma')

  // Pausar recorrência.
  await page.getByRole('button', { name: 'Gerenciar Assinatura Figma' }).click()
  await page.getByRole('dialog', { name: 'Despesa recorrente' }).getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByRole('list', { name: 'Despesas recorrentes' })).toContainText('Pausada')

  await page.goto('/')
  await expect(page.getByRole('group', { name: 'Despesas', exact: true })).toContainText('R$ 1.000,00')
  await expect(page.getByRole('group', { name: 'Lucro', exact: true })).toContainText('-R$ 1.000,00')
})

test('contratos recorrentes geram cobranças mensais e compõem o MRR', async ({ page }) => {
  await createClient(page, 'Loja Brisa')
  await page.goto('/contratos')
  await page.getByRole('button', { name: 'Novo contrato' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Novo contrato recorrente' })
  await dialog.getByLabel('Cliente').selectOption({ label: 'Loja Brisa' })
  await dialog.getByLabel('Descrição').fill('Manutenção e hospedagem')
  await dialog.getByLabel('Tipo de serviço').selectOption({ label: 'Manutenção' })
  await dialog.getByLabel('Valor mensal').fill('45000')
  await dialog.getByLabel('Início').fill('2026-07-01')
  await dialog.getByLabel('Dia do vencimento').selectOption('10')
  await expect(dialog.getByLabel('Marcar cobranças anteriores a hoje como pagas')).toBeChecked()
  await dialog.getByRole('button', { name: 'Criar contrato' }).click()
  await expect(page.getByText('Contrato criado')).toBeVisible()

  await expect(page.getByRole('list', { name: 'Contratos' })).toContainText('próxima cobrança 10 out 2026')
  await expect(page.getByText('R$ 450,00').first()).toBeVisible()

  await page.goto('/recebimentos?aba=pagos')
  await expect(page.getByRole('list', { name: 'Parcelas' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Parcelas' })).toContainText('Mensalidade setembro de 2026')

  await page.goto('/')
  await expect(page.getByRole('group', { name: 'MRR', exact: true })).toContainText('R$ 450,00')
  await expect(page.getByRole('group', { name: 'MRR', exact: true })).toContainText('1 contrato ativo')
  await expect(page.getByRole('group', { name: 'Receita recebida', exact: true })).toContainText('R$ 450,00')

  // Pausar remove do MRR.
  await page.goto('/contratos')
  await page.getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByText('Contrato pausado')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('group', { name: 'MRR', exact: true })).toContainText('R$ 0,00')
})

test('pipeline de propostas: avançar, perder, reabrir e converter em venda', async ({ page }) => {
  await page.goto('/propostas')
  const create = async (title: string, lead: string, value: string) => {
    await page.getByRole('button', { name: 'Nova proposta' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Nova proposta' })
    await dialog.getByLabel('Título').fill(title)
    await dialog.getByLabel('Nome do lead').fill(lead)
    await dialog.getByLabel('Valor estimado').fill(value)
    await dialog.getByRole('button', { name: 'Criar proposta' }).click()
    await expect(page.getByText('Proposta criada').first()).toBeVisible()
  }
  await create('E-commerce de cosméticos', 'Bella Cosméticos', '1800000')
  await create('Sistema de estoque', 'Distribuidora Sol', '900000')

  const lead = page.getByRole('region', { name: 'Lead' })
  const negotiation = page.getByRole('region', { name: 'Negociação' })
  const lost = page.getByRole('region', { name: 'Perdida' })
  const won = page.getByRole('region', { name: 'Ganha' })
  await expect(lead.getByRole('article')).toHaveCount(2)

  const ecommerce = page.getByRole('article', { name: 'E-commerce de cosméticos' })
  await ecommerce.getByRole('button', { name: /Proposta/ }).click()
  await ecommerce.getByRole('button', { name: /Negociação/ }).click()
  await expect(negotiation.getByRole('article', { name: 'E-commerce de cosméticos' })).toBeVisible()

  const estoque = page.getByRole('article', { name: 'Sistema de estoque' })
  await estoque.getByRole('button', { name: /como perdida/ }).click()
  const lostDialog = page.getByRole('dialog', { name: 'Marcar como perdida' })
  await lostDialog.getByLabel('Motivo').fill('Preço')
  await lostDialog.getByRole('button', { name: 'Marcar como perdida' }).click()
  await expect(lost.getByRole('article', { name: 'Sistema de estoque' })).toContainText('Motivo: Preço')
  await lost.getByRole('button', { name: 'Reabrir' }).click()
  await expect(lead.getByRole('article', { name: 'Sistema de estoque' })).toBeVisible()

  await page
    .getByRole('article', { name: 'E-commerce de cosméticos' })
    .getByRole('button', { name: 'Converter em venda' })
    .click()
  const sale = page.getByRole('dialog', { name: 'Converter proposta em venda' })
  await expect(sale.getByLabel('Nome', { exact: true })).toHaveValue('Bella Cosméticos')
  await expect(sale.getByLabel('Valor total')).toHaveValue('18.000,00')
  await sale.getByRole('button', { name: 'Salvar venda' }).click()
  await expect(page.getByText('Venda registrada')).toBeVisible()
  await expect(won.getByRole('article', { name: 'E-commerce de cosméticos' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Taxa de ganho', exact: true })).toContainText('100%')

  await won.getByRole('link', { name: 'Ver venda' }).click()
  await expect(page.getByRole('dialog', { name: 'E-commerce de cosméticos' })).toContainText('Bella Cosméticos')

  await page.goto('/clientes')
  await expectPageVisible(page)
  await expect(page.getByRole('list', { name: 'Clientes' })).toContainText('Bella Cosméticos')

  await page.goto('/')
  const funnel = page.getByRole('region', { name: 'Funil de propostas' })
  await expect(funnel).toContainText('Lead')
  await funnel.getByRole('button', { name: 'Ver Funil de propostas como tabela' }).click()
  await expect(funnel.getByRole('row', { name: /Ganha/ })).toContainText('R$ 18.000,00')
})

test('clientes: cadastro, LTV, detalhe e exclusão bloqueada com vendas', async ({ page }) => {
  await createClient(page, 'Ateliê Norte', { company: 'Norte Ltda', email: 'oi@norte.com' })
  await expect(page.getByText('oi@norte.com')).toBeVisible()
  await page.getByRole('button', { name: 'Nova venda' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova venda' })
  await expect(dialog.getByLabel('Cliente', { exact: true })).toHaveValue(/.+/)
  await dialog.getByLabel('Projeto', { exact: true }).fill('Identidade visual')
  await dialog.getByLabel('Tipo de serviço').selectOption({ label: 'Design' })
  await dialog.getByLabel('Valor total').fill('320000')
  await dialog.getByRole('checkbox', { name: 'Recebida' }).check()
  await dialog.getByRole('button', { name: 'Salvar venda' }).click()
  await page.getByRole('dialog', { name: 'Identidade visual' }).getByRole('button', { name: 'Fechar' }).click()

  await page.goto('/clientes')
  await expect(page.getByRole('list', { name: 'Clientes' })).toContainText('R$ 3.200,00')
  await page.getByRole('link', { name: /Ateliê Norte/ }).click()
  await expect(page.getByRole('group', { name: 'LTV (recebido)', exact: true })).toContainText('R$ 3.200,00')
  await page.getByRole('button', { name: 'Excluir cliente' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir cliente' }).click()
  await expect(
    page.getByText('Este cliente tem vendas, contratos ou recebimentos. Exclua-os antes de remover o cliente.'),
  ).toBeVisible()
})

test('relatórios: resumo anual e exportação CSV', async ({ page }) => {
  await createSale(page, {
    client: 'Café Grão',
    newClient: true,
    title: 'Cardápio digital',
    total: '180000',
    firstDue: '2026-09-01',
    type: 'Sistema web',
  })
  const detail = page.getByRole('dialog', { name: 'Cardápio digital' })
  await detail.getByRole('button', { name: 'Receber' }).click()
  await page.getByRole('dialog', { name: 'Registrar recebimento' }).getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page.getByText('Recebimento registrado')).toBeVisible()

  await page.goto('/relatorios')
  await expectPageVisible(page)
  await expect(page.getByRole('region', { name: 'Mês a mês — 2026' })).toContainText('R$ 1.800,00')
  await expect(page.getByRole('region', { name: 'Receita e despesas por mês' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Resumo mensal 2026/ }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('nexora-resumo-2026.csv')
  const csv = await readFile((await file.path())!, 'utf8')
  expect(csv).toContain('Mês;Receita recebida (R$)')
  expect(csv).toContain('setembro de 2026;1.800,00')

  const salesDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: /Vendas 2026/ }).click()
  const salesCsv = await readFile((await (await salesDownload).path())!, 'utf8')
  expect(salesCsv).toContain('Café Grão;Cardápio digital;Sistema web')
})

test('configurações: meta, tema, backup, restauração e apagar tudo', async ({ page }) => {
  await page.goto('/configuracoes')
  await page.getByLabel('Nome da empresa').fill('NEXORA')
  await page.getByLabel('Meta de receita mensal').fill('2000000')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Configurações salvas')).toBeVisible()

  await page.getByRole('radio', { name: 'Escuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('radio', { name: 'Claro' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await createSale(page, {
    client: 'Rede Mar',
    newClient: true,
    title: 'Portal institucional',
    total: '500000',
    firstDue: '2026-09-15',
  })
  await page.getByRole('dialog', { name: 'Portal institucional' }).getByRole('button', { name: 'Receber' }).click()
  await page.getByRole('dialog', { name: 'Registrar recebimento' }).getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page.getByText('Recebimento registrado')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Olá, NEXORA')
  await expect(page.getByRole('group', { name: /Meta de setembro/ })).toContainText('25%')
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '25')

  // Backup.
  await page.goto('/configuracoes')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup (JSON)' }).click()
  const backupPath = (await (await download).path())!
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  expect(backup.app).toBe('nexora-gestao')
  expect(backup.data.sales).toHaveLength(1)

  // Apagar tudo.
  await page.getByRole('button', { name: 'Apagar tudo' }).click()
  const wipe = page.getByRole('alertdialog', { name: 'Apagar todos os dados?' })
  await expect(wipe.getByRole('button', { name: 'Apagar definitivamente' })).toBeDisabled()
  await wipe.getByLabel('Digite "APAGAR" para confirmar').fill('APAGAR')
  await wipe.getByRole('button', { name: 'Apagar definitivamente' }).click()
  await expect(page.getByTestId('storage-summary')).toContainText(
    '0 clientes · 0 vendas · 0 despesas · 0 contratos · 0 propostas',
  )
  await expect(page.getByLabel('Nome da empresa')).toHaveValue('')
  await expect(page.getByLabel('Meta de receita mensal')).toHaveValue('')

  // Restaurar.
  await page.getByLabel('Arquivo de backup').setInputFiles(backupPath)
  await page
    .getByRole('alertdialog', { name: 'Restaurar este backup?' })
    .getByRole('button', { name: 'Substituir e restaurar' })
    .click()
  await expect(page.getByText('Backup restaurado')).toBeVisible()
  await expect(page.getByTestId('storage-summary')).toContainText('1 cliente · 1 venda · 0 despesas · 0 contratos · 0 propostas')
  await expect(page.getByLabel('Nome da empresa')).toHaveValue('NEXORA')

  // Arquivo inválido.
  await page
    .getByLabel('Arquivo de backup')
    .setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"outro"}') })
  await expect(page.getByText(/Backup inválido/)).toBeVisible()
})
