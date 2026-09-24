import { toCsv } from '@/lib/csv'
import { formatDate, formatMonthKey } from '@/lib/dates'
import { formatDecimal } from '@/lib/money'
import {
  CONTRACT_STATUS_LABEL,
  EXPENSE_CATEGORY_LABEL,
  PAYMENT_MODE_LABEL,
  PROJECT_STATUS_LABEL,
  SERVICE_TYPE_LABEL,
} from './labels'
import { annualReport, clientStats, describeReceivable, indexDataset, receivableState, saleCostsCents } from './metrics'
import type { Dataset } from './types'

const money = (cents: number) => formatDecimal(cents)
const date = (iso: string | null) => (iso ? formatDate(iso, 'short') : '')

const STATE_LABEL = { paid: 'Pago', open: 'Em aberto', overdue: 'Atrasado', void: 'Cancelado' } as const

export function annualSummaryCsv(ds: Dataset, year: number, today: string): string {
  const r = annualReport(ds, year, today)
  const rows = r.months.map((m, i) => [
    formatMonthKey(m.month, 'long'),
    money(m.revenueCents),
    money(m.operatingExpensesCents),
    money(m.projectCostsCents),
    money(m.profitCents),
    m.salesCount,
    money(m.salesValueCents),
    r.newClientsByMonth[i] ?? 0,
  ])
  rows.push([
    `Total ${year}`,
    money(r.totals.revenueCents),
    money(r.totals.operatingExpensesCents),
    money(r.totals.projectCostsCents),
    money(r.totals.profitCents),
    r.totals.salesCount,
    money(r.totals.salesValueCents),
    r.newClients,
  ])
  return toCsv(
    [
      'Mês',
      'Receita recebida (R$)',
      'Despesas operacionais (R$)',
      'Custos de projetos (R$)',
      'Lucro (R$)',
      'Vendas',
      'Valor vendido (R$)',
      'Novos clientes',
    ],
    rows,
  )
}

export function salesCsv(ds: Dataset, year: number, today: string): string {
  const index = indexDataset(ds)
  const rows = ds.sales
    .filter((s) => s.date.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const parcels = ds.receivables.filter((r) => r.saleId === s.id)
      const paid = parcels.filter((r) => receivableState(r, today, s) === 'paid').reduce((a, r) => a + r.amountCents, 0)
      const costs = saleCostsCents(s)
      return [
        date(s.date),
        index.clients.get(s.clientId)?.name ?? '',
        s.title,
        SERVICE_TYPE_LABEL[s.serviceType],
        PROJECT_STATUS_LABEL[s.status],
        money(s.totalCents),
        PAYMENT_MODE_LABEL[s.paymentMode],
        parcels.length,
        money(paid),
        money(costs),
        money(s.totalCents - costs),
        date(s.deadline),
      ]
    })
  return toCsv(
    [
      'Data',
      'Cliente',
      'Projeto',
      'Tipo',
      'Status',
      'Valor (R$)',
      'Pagamento',
      'Parcelas',
      'Recebido (R$)',
      'Custos (R$)',
      'Margem (R$)',
      'Prazo',
    ],
    rows,
  )
}

export function receivablesCsv(ds: Dataset, year: number, today: string): string {
  const index = indexDataset(ds)
  const rows = ds.receivables
    .filter((r) => r.dueDate.startsWith(`${year}-`) || (r.paidDate ?? '').startsWith(`${year}-`))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((r) => {
      const d = describeReceivable(r, index)
      return [
        date(r.dueDate),
        index.clients.get(r.clientId)?.name ?? '',
        d.title,
        d.detail,
        r.saleId ? 'Venda' : 'Contrato',
        money(r.amountCents),
        STATE_LABEL[receivableState(r, today, r.saleId ? index.sales.get(r.saleId) : null)],
        date(r.paidDate),
      ]
    })
  return toCsv(['Vencimento', 'Cliente', 'Origem', 'Parcela', 'Tipo', 'Valor (R$)', 'Situação', 'Pago em'], rows)
}

export function expensesCsv(ds: Dataset, year: number): string {
  const rows = ds.expenses
    .filter((e) => e.date.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [
      date(e.date),
      e.description,
      EXPENSE_CATEGORY_LABEL[e.category],
      money(e.amountCents),
      e.recurringId ? 'Sim' : 'Não',
      e.notes,
    ])
  return toCsv(['Data', 'Descrição', 'Categoria', 'Valor (R$)', 'Recorrente', 'Observações'], rows)
}

export function clientsCsv(ds: Dataset, today: string): string {
  const stats = clientStats(ds, today)
  const rows = [...ds.clients]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((c) => {
      const s = stats.get(c.id)
      return [
        c.name,
        c.company,
        c.email,
        c.phone,
        c.document,
        money(s?.ltvCents ?? 0),
        money(s?.soldCents ?? 0),
        money((s?.openCents ?? 0) + (s?.overdueCents ?? 0)),
        money(s?.mrrCents ?? 0),
        s?.salesCount ?? 0,
        date(s?.firstDealDate ?? null),
        date(s?.lastDealDate ?? null),
      ]
    })
  return toCsv(
    [
      'Nome',
      'Empresa',
      'E-mail',
      'Telefone',
      'CPF/CNPJ',
      'LTV recebido (R$)',
      'Total contratado (R$)',
      'A receber (R$)',
      'MRR (R$)',
      'Vendas',
      'Primeiro negócio',
      'Último negócio',
    ],
    rows,
  )
}

export function contractsCsv(ds: Dataset): string {
  const index = indexDataset(ds)
  const rows = ds.contracts.map((c) => [
    index.clients.get(c.clientId)?.name ?? '',
    c.description,
    SERVICE_TYPE_LABEL[c.serviceType],
    money(c.monthlyCents),
    c.billingDay,
    date(c.startDate),
    date(c.endDate),
    CONTRACT_STATUS_LABEL[c.status],
  ])
  return toCsv(['Cliente', 'Descrição', 'Tipo', 'Valor mensal (R$)', 'Dia de vencimento', 'Início', 'Término', 'Status'], rows)
}
