import { describe, expect, it } from 'vitest'
import { client, contract, dataset, expense, proposal, receivable, sale } from '@/test/factories'
import {
  annualReport,
  clientStats,
  expensesByCategory,
  goalProgress,
  indexDataset,
  monthlySeries,
  mrr,
  overviewMetrics,
  proposalFunnel,
  receivableState,
  receivablesSnapshot,
  revenueByService,
  saleSummary,
  summarizePeriod,
  upcomingReceivables,
  yearsWithData,
} from './metrics'

const today = '2026-09-24'
const sept = { start: '2026-09-01', end: '2026-09-30' }

function scenario() {
  const ana = client({ name: 'Ana' })
  const bia = client({ name: 'Bia' })
  const site = sale({
    clientId: ana.id,
    serviceType: 'institutional_site',
    totalCents: 600000,
    date: '2026-09-02',
    costs: [{ id: 'x', description: 'Tema', amountCents: 50000 }],
  })
  const app = sale({ clientId: bia.id, serviceType: 'mobile_app', totalCents: 1200000, date: '2026-08-15' })
  const cancelled = sale({ clientId: bia.id, totalCents: 999900, date: '2026-09-03', status: 'cancelled' })
  const k = contract({ clientId: ana.id, monthlyCents: 30000, startDate: '2026-01-01' })
  const receivables = [
    receivable({
      clientId: ana.id,
      saleId: site.id,
      number: 1,
      count: 2,
      amountCents: 300000,
      dueDate: '2026-09-02',
      paidDate: '2026-09-02',
    }),
    receivable({ clientId: ana.id, saleId: site.id, number: 2, count: 2, amountCents: 300000, dueDate: '2026-10-02' }),
    receivable({
      clientId: bia.id,
      saleId: app.id,
      number: 1,
      count: 3,
      amountCents: 400000,
      dueDate: '2026-08-15',
      paidDate: '2026-08-15',
    }),
    receivable({ clientId: bia.id, saleId: app.id, number: 2, count: 3, amountCents: 400000, dueDate: '2026-09-15' }),
    receivable({ clientId: bia.id, saleId: app.id, number: 3, count: 3, amountCents: 400000, dueDate: '2026-10-15' }),
    receivable({ clientId: bia.id, saleId: cancelled.id, amountCents: 999900, dueDate: '2026-09-03' }),
    receivable({
      clientId: ana.id,
      contractId: k.id,
      periodKey: '2026-09',
      amountCents: 30000,
      dueDate: '2026-09-10',
      paidDate: '2026-09-11',
    }),
  ]
  const expenses = [
    expense({ amountCents: 20000, date: '2026-09-05', category: 'software' }),
    expense({ amountCents: 80000, date: '2026-09-06', category: 'marketing' }),
    expense({ amountCents: 15000, date: '2026-08-06', category: 'software' }),
  ]
  const ds = dataset({
    clients: [ana, bia],
    sales: [site, app, cancelled],
    receivables,
    expenses,
    contracts: [k],
    settings: { ...dataset().settings, monthlyGoalCents: 1000000 },
  })
  return { ds, ana, bia, site, app, cancelled, k }
}

describe('estado dos recebíveis', () => {
  it('classifica pago, em aberto, atrasado e anulado', () => {
    const { ds, cancelled } = scenario()
    const [paid, open, , overdue, , voided] = ds.receivables
    expect(receivableState(paid!, today)).toBe('paid')
    expect(receivableState(open!, today)).toBe('open')
    expect(receivableState(overdue!, today)).toBe('overdue')
    expect(receivableState(voided!, today, cancelled)).toBe('void')
  })
  it('resume a receber e atrasados ignorando vendas canceladas', () => {
    const { ds } = scenario()
    const snap = receivablesSnapshot(ds, indexDataset(ds), today)
    expect(snap).toEqual({ openCents: 700000, openCount: 2, overdueCents: 400000, overdueCount: 1, next30Cents: 700000 })
  })
})

describe('resumo do período', () => {
  it('calcula receita, despesas, lucro, vendas e ticket', () => {
    const { ds } = scenario()
    const s = summarizePeriod(ds, sept)
    expect(s.revenueCents).toBe(330000)
    expect(s.operatingExpensesCents).toBe(100000)
    expect(s.projectCostsCents).toBe(50000)
    expect(s.expensesCents).toBe(150000)
    expect(s.profitCents).toBe(180000)
    expect(s.margin).toBeCloseTo(180000 / 330000)
    expect(s.salesCount).toBe(1)
    expect(s.salesValueCents).toBe(600000)
    expect(s.averageTicketCents).toBe(600000)
  })
  it('retorna zeros sem dados', () => {
    const s = summarizePeriod(dataset(), sept)
    expect(s).toMatchObject({
      revenueCents: 0,
      expensesCents: 0,
      profitCents: 0,
      margin: null,
      salesCount: 0,
      averageTicketCents: 0,
    })
  })
})

describe('séries e agrupamentos', () => {
  it('monta série mensal', () => {
    const { ds } = scenario()
    const series = monthlySeries(ds, '2026-08', '2026-09')
    expect(series.map((p) => [p.month, p.revenueCents, p.expensesCents, p.profitCents])).toEqual([
      ['2026-08', 400000, 15000, 385000],
      ['2026-09', 330000, 150000, 180000],
    ])
  })
  it('agrupa receita por serviço e despesas por categoria', () => {
    const { ds } = scenario()
    const idx = indexDataset(ds)
    expect(revenueByService(ds, idx, sept).map((r) => [r.key, r.cents])).toEqual([
      ['institutional_site', 300000],
      ['maintenance', 30000],
    ])
    const cats = expensesByCategory(ds, sept)
    expect(cats.map((c) => [c.key, c.cents])).toEqual([
      ['marketing', 80000],
      ['software', 20000],
    ])
    expect(cats[0]!.share).toBeCloseTo(0.8)
  })
  it('lista próximos recebimentos por vencimento', () => {
    const { ds } = scenario()
    const up = upcomingReceivables(ds, indexDataset(ds), today)
    expect(up.map((u) => [u.receivable.dueDate, u.state])).toEqual([
      ['2026-09-15', 'overdue'],
      ['2026-10-02', 'open'],
      ['2026-10-15', 'open'],
    ])
  })
})

describe('MRR, meta e clientes', () => {
  it('soma contratos ativos', () => {
    const { ds, k } = scenario()
    expect(mrr(ds, today)).toEqual({ cents: 30000, activeCount: 1 })
    expect(mrr({ contracts: [{ ...k, status: 'paused' }] }, today)).toEqual({ cents: 0, activeCount: 0 })
    expect(mrr({ contracts: [{ ...k, startDate: '2026-10-01' }] }, today).cents).toBe(0)
  })
  it('mede a meta do mês', () => {
    const { ds } = scenario()
    expect(goalProgress(ds, today)).toEqual({ month: '2026-09', goalCents: 1000000, achievedCents: 330000, ratio: 0.33 })
    expect(goalProgress(dataset(), today).ratio).toBeNull()
  })
  it('calcula LTV e valores por cliente', () => {
    const { ds, ana, bia } = scenario()
    const stats = clientStats(ds, today)
    expect(stats.get(ana.id)).toMatchObject({
      ltvCents: 330000,
      openCents: 300000,
      salesCount: 1,
      mrrCents: 30000,
      activeContracts: 1,
    })
    expect(stats.get(bia.id)).toMatchObject({ ltvCents: 400000, openCents: 400000, overdueCents: 400000, salesCount: 1 })
    expect(stats.get(bia.id)!.soldCents).toBe(1200000)
  })
  it('resume a venda com margem', () => {
    const { ds, site } = scenario()
    const s = saleSummary(site, ds.receivables, today)
    expect(s).toMatchObject({ paidCents: 300000, openCents: 300000, costsCents: 50000, marginCents: 550000, paidCount: 1 })
    expect(s.progress).toBeCloseTo(0.5)
    expect(s.installments.map((i) => i.number)).toEqual([1, 2])
  })
})

describe('funil de propostas', () => {
  it('conta etapas alcançadas e taxa de ganho', () => {
    const list = [
      proposal({ stage: 'lead', furthestStage: 'lead', valueCents: 100 }),
      proposal({ stage: 'proposal', furthestStage: 'proposal', valueCents: 200 }),
      proposal({ stage: 'lost', furthestStage: 'negotiation', valueCents: 300 }),
      proposal({ stage: 'won', furthestStage: 'won', valueCents: 400 }),
      proposal({ stage: 'won', furthestStage: 'won', valueCents: 500, createdDate: '2025-01-01' }),
    ]
    const f = proposalFunnel(list, sept)
    expect(f.steps.map((s) => [s.stage, s.count, s.valueCents])).toEqual([
      ['lead', 4, 1000],
      ['proposal', 3, 900],
      ['negotiation', 2, 700],
      ['won', 1, 400],
    ])
    expect(f.steps[1]!.rate).toBeCloseTo(0.75)
    expect(f.winRate).toBeCloseTo(0.5)
    expect(f).toMatchObject({ lostCount: 1, openCount: 2, openValueCents: 300, total: 4 })
  })
  it('funil vazio', () => {
    const f = proposalFunnel([])
    expect(f.total).toBe(0)
    expect(f.winRate).toBeNull()
    expect(f.steps.every((s) => s.count === 0 && s.rate === null)).toBe(true)
  })
})

describe('visão geral e relatório anual', () => {
  it('compara com o período anterior equivalente', () => {
    const { ds } = scenario()
    const o = overviewMetrics(ds, sept, today)
    expect(o.comparison).toEqual({ start: '2026-08-01', end: '2026-08-24' })
    expect(o.previous.revenueCents).toBe(400000)
    expect(o.monthly).toHaveLength(12)
    expect(o.monthly.at(-1)!.month).toBe('2026-09')
    expect(o.topClients.map((c) => c.cents)).toEqual([330000])
  })
  it('gera relatório anual com novos clientes', () => {
    const { ds } = scenario()
    const r = annualReport(ds, 2026, today)
    expect(r.months).toHaveLength(12)
    expect(r.totals.revenueCents).toBe(730000)
    expect(r.totals.salesCount).toBe(2)
    expect(r.newClients).toBe(2)
    expect(r.newClientsByMonth[0]).toBe(1)
    expect(yearsWithData(ds, today)).toEqual([2026])
  })
})
