import { describe, expect, it } from 'vitest'
import { client, dataset, expense, receivable, sale } from '@/test/factories'
import { annualSummaryCsv, clientsCsv, expensesCsv, receivablesCsv, salesCsv } from './exports'

const today = '2026-09-24'

function ds() {
  const c = client({ name: 'Aurora; Pães' })
  const s = sale({ clientId: c.id, title: 'Site', totalCents: 250050, date: '2026-03-10' })
  return dataset({
    clients: [c],
    sales: [s],
    receivables: [
      receivable({ clientId: c.id, saleId: s.id, amountCents: 250050, dueDate: '2026-03-10', paidDate: '2026-03-12' }),
    ],
    expenses: [expense({ description: 'Figma', amountCents: 7500, date: '2026-03-01' })],
  })
}

describe('exportações CSV', () => {
  it('resumo anual tem 12 meses e total', () => {
    const lines = annualSummaryCsv(ds(), 2026, today).trim().split('\r\n')
    expect(lines).toHaveLength(14)
    expect(lines[3]).toBe('março de 2026;2.500,50;75,00;0,00;2.425,50;1;2.500,50;1')
    expect(lines[13]).toBe('Total 2026;2.500,50;75,00;0,00;2.425,50;1;2.500,50;1')
  })
  it('vendas, recebimentos, despesas e clientes', () => {
    const d = ds()
    expect(salesCsv(d, 2026, today)).toContain(
      '10/03/2026;"Aurora; Pães";Site;Site institucional;Em andamento;2.500,50;À vista;1;2.500,50;0,00;2.500,50;',
    )
    expect(receivablesCsv(d, 2026, today)).toContain(';Pago;12/03/2026')
    expect(expensesCsv(d, 2026)).toContain('01/03/2026;Figma;Ferramentas e software;75,00;Não;')
    expect(clientsCsv(d, today)).toContain('"Aurora; Pães";;;;;2.500,50;2.500,50;0,00;0,00;1;10/03/2026;10/03/2026')
    expect(salesCsv(d, 2025, today).trim().split('\r\n')).toHaveLength(1)
  })
})
