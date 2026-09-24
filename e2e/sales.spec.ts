import { createClient, createSale, expect, expectPageVisible, test } from './fixtures'

test('venda parcelada: parcelas, recebimento e reflexo na visão geral', async ({ page }) => {
  await createSale(page, {
    client: 'Padaria Aurora',
    newClient: true,
    title: 'Site da Aurora',
    total: '600000',
    installments: 3,
    firstDue: '2026-09-10',
  })

  const detail = page.getByRole('dialog', { name: 'Site da Aurora' })
  await expect(detail.getByText('Padaria Aurora · Site institucional')).toBeVisible()
  const parcels = detail.getByRole('region', { name: 'Parcelas' }).getByRole('listitem')
  await expect(parcels).toHaveCount(3)
  await expect(parcels.nth(0)).toContainText('R$ 2.000,00')
  await expect(parcels.nth(0)).toContainText('Atrasado')
  await expect(parcels.nth(1)).toContainText('10 out 2026')

  // Recebe a primeira parcela em 12/09.
  await parcels.nth(0).getByRole('button', { name: 'Receber' }).click()
  const receive = page.getByRole('dialog', { name: 'Registrar recebimento' })
  await receive.getByLabel('Data do pagamento').fill('2026-09-12')
  await receive.getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page.getByText('Recebimento registrado')).toBeVisible()
  await expect(parcels.nth(0)).toContainText('Recebida em 12 set 2026')
  await expect(detail.getByText('1 de 3 parcelas recebidas')).toBeVisible()
  await detail.getByRole('button', { name: 'Fechar' }).click()

  await page.goto('/')
  await expectPageVisible(page)
  await expect(page.getByRole('group', { name: 'Receita recebida', exact: true })).toContainText('R$ 2.000,00')
  await expect(page.getByRole('group', { name: 'Vendas fechadas', exact: true })).toContainText('1')
  await expect(page.getByRole('group', { name: 'Ticket médio', exact: true })).toContainText('R$ 6.000,00')
  await expect(page.getByRole('group', { name: 'A receber', exact: true })).toContainText('R$ 4.000,00')
  await expect(page.getByRole('group', { name: 'Lucro', exact: true })).toContainText('R$ 2.000,00')
  await expect(page.getByRole('region', { name: 'Maiores clientes' })).toContainText('Padaria Aurora')
  await expect(page.getByRole('region', { name: 'Receita por tipo de serviço' })).toContainText('Site institucional')

  // Gráfico navegável pelo teclado, com tooltip.
  const chart = page.getByRole('region', { name: 'Receita x despesas' })
  const plot = chart.getByRole('group', { name: /Receita e despesas nos últimos 12 meses/ })
  await plot.focus()
  await expect(chart.getByRole('status')).toContainText('setembro de 2026')
  await expect(chart.getByRole('status')).toContainText('R$ 2.000,00')
  await page.keyboard.press('ArrowLeft')
  await expect(chart.getByRole('status')).toContainText('agosto de 2026')

  // Visão de tabela do gráfico.
  await chart.getByRole('button', { name: 'Ver Receita x despesas como tabela' }).click()
  await expect(chart.getByRole('table')).toContainText('setembro de 2026')
  await expect(chart.getByRole('row', { name: /setembro de 2026/ })).toContainText('R$ 2.000,00')
})

test('parcelamento personalizado exige soma igual ao total', async ({ page }) => {
  await createClient(page, 'Estúdio Lume')
  await page.goto('/vendas?nova=1')
  const dialog = page.getByRole('dialog', { name: 'Nova venda' })
  await dialog.getByLabel('Cliente', { exact: true }).selectOption({ label: 'Estúdio Lume' })
  await dialog.getByLabel('Projeto', { exact: true }).fill('App de agendamento')
  await dialog.getByLabel('Tipo de serviço').selectOption({ label: 'App' })
  await dialog.getByLabel('Valor total').fill('1000000')
  await dialog.getByRole('radio', { name: 'Personalizado' }).click()
  await dialog.getByLabel('Valor da parcela 1').fill('400000')
  await expect(dialog.getByText('Faltam R$ 6.000,00')).toBeVisible()
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click()
  await expect(dialog.getByLabel('Valor da parcela 2')).toHaveValue('6.000,00')
  await dialog.getByLabel('Valor da parcela 2').fill('500000')
  await expect(dialog.getByText('Faltam R$ 1.000,00')).toBeVisible()
  await dialog.getByRole('button', { name: 'Salvar venda' }).click()
  await expect(dialog.getByText('A soma das parcelas deve ser igual ao valor total')).toBeVisible()
  await dialog.getByRole('button', { name: 'Ajustar última parcela' }).click()
  await expect(dialog.getByText('Soma R$ 10.000,00')).toBeVisible()

  // Custo do projeto e margem.
  await dialog.getByRole('button', { name: 'Adicionar custo' }).click()
  await dialog.getByLabel('Descrição do custo 1').fill('Licença de componentes')
  await dialog.getByLabel('Valor do custo 1').fill('150000')
  await expect(dialog.getByText('R$ 8.500,00 · 85%')).toBeVisible()
  await dialog.getByRole('button', { name: 'Salvar venda' }).click()

  const detail = page.getByRole('dialog', { name: 'App de agendamento' })
  await expect(detail.getByRole('region', { name: 'Parcelas' }).getByRole('listitem')).toHaveCount(2)
  await expect(detail.getByText('Licença de componentes')).toBeVisible()
  await expect(detail).toContainText('R$ 8.500,00')
})

test('editar, mudar status, filtrar e excluir venda', async ({ page }) => {
  await createSale(page, {
    client: 'Clínica Viva',
    newClient: true,
    title: 'Landing de campanha',
    total: '250000',
    type: 'Landing page',
    firstDue: '2026-09-20',
  })
  const detail = page.getByRole('dialog', { name: 'Landing de campanha' })
  await detail.getByLabel('Status do projeto').selectOption({ label: 'Entregue' })
  await expect(page.getByText('Status atualizado')).toBeVisible()
  await detail.getByRole('button', { name: 'Editar' }).click()
  const edit = page.getByRole('dialog', { name: 'Editar venda' })
  await edit.getByLabel('Projeto', { exact: true }).fill('Landing da campanha de verão')
  await edit.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Venda atualizada')).toBeVisible()

  await page.getByLabel('Filtrar por status').selectOption({ label: 'Em andamento' })
  await expect(page.getByText('Nenhuma venda encontrada')).toBeVisible()
  await page.getByLabel('Filtrar por status').selectOption({ label: 'Entregue' })
  await page.getByRole('button', { name: 'Landing da campanha de verão' }).first().click()

  const reopened = page.getByRole('dialog', { name: 'Landing da campanha de verão' })
  await reopened.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('alertdialog', { name: 'Excluir esta venda?' }).getByRole('button', { name: 'Excluir venda' }).click()
  await expect(page.getByText('Venda excluída')).toBeVisible()
  await expect(page.getByText('Nenhuma venda registrada')).toBeVisible()
})
