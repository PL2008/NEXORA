import { addDays, addMonthsToKey, formatMonthKey, isWithin, monthKey, monthRange, type ISODate, type MonthKey } from '@/lib/dates'
import { sumCents } from '@/lib/money'
import { comparisonRange, type DateRange } from './period'
import {
  FUNNEL_STAGES,
  type Client,
  type Contract,
  type Dataset,
  type ExpenseCategory,
  type FunnelStage,
  type Proposal,
  type Receivable,
  type Sale,
  type ServiceType,
} from './types'

// ————————————————————————————————————————————— índices

export interface DatasetIndex {
  clients: Map<string, Client>
  sales: Map<string, Sale>
  contracts: Map<string, Contract>
}

export function indexDataset(ds: Pick<Dataset, 'clients' | 'sales' | 'contracts'>): DatasetIndex {
  return {
    clients: new Map(ds.clients.map((c) => [c.id, c])),
    sales: new Map(ds.sales.map((s) => [s.id, s])),
    contracts: new Map(ds.contracts.map((c) => [c.id, c])),
  }
}

// ————————————————————————————————————————————— recebíveis

export type ReceivableState = 'paid' | 'open' | 'overdue' | 'void'

export function receivableState(r: Receivable, today: ISODate, sale?: Sale | null): ReceivableState {
  if (r.paidDate) return 'paid'
  if (sale && sale.status === 'cancelled') return 'void'
  return r.dueDate < today ? 'overdue' : 'open'
}

export function receivableServiceType(r: Receivable, index: DatasetIndex): ServiceType {
  if (r.saleId) return index.sales.get(r.saleId)?.serviceType ?? 'other'
  if (r.contractId) return index.contracts.get(r.contractId)?.serviceType ?? 'other'
  return 'other'
}

export function describeReceivable(r: Receivable, index: DatasetIndex): { title: string; detail: string } {
  if (r.saleId) {
    const sale = index.sales.get(r.saleId)
    return {
      title: sale?.title ?? 'Venda removida',
      detail: r.count > 1 ? `Parcela ${r.number}/${r.count}` : 'Parcela única',
    }
  }
  if (r.contractId) {
    const contract = index.contracts.get(r.contractId)
    return {
      title: contract?.description ?? 'Contrato removido',
      detail: r.periodKey ? `Mensalidade ${formatMonthKey(r.periodKey, 'long')}` : 'Mensalidade',
    }
  }
  return { title: 'Recebimento', detail: '' }
}

export interface ReceivablesSnapshot {
  openCents: number
  openCount: number
  overdueCents: number
  overdueCount: number
  next30Cents: number
}

export function receivablesSnapshot(ds: Pick<Dataset, 'receivables'>, index: DatasetIndex, today: ISODate): ReceivablesSnapshot {
  const in30 = addDays(today, 30)
  const snap: ReceivablesSnapshot = { openCents: 0, openCount: 0, overdueCents: 0, overdueCount: 0, next30Cents: 0 }
  for (const r of ds.receivables) {
    const state = receivableState(r, today, r.saleId ? index.sales.get(r.saleId) : null)
    if (state === 'open') {
      snap.openCents += r.amountCents
      snap.openCount++
      if (r.dueDate <= in30) snap.next30Cents += r.amountCents
    } else if (state === 'overdue') {
      snap.overdueCents += r.amountCents
      snap.overdueCount++
    }
  }
  return snap
}

// ————————————————————————————————————————————— resumo de período

export interface PeriodSummary {
  revenueCents: number
  operatingExpensesCents: number
  projectCostsCents: number
  expensesCents: number
  profitCents: number
  margin: number | null
  salesCount: number
  salesValueCents: number
  averageTicketCents: number
}

export const isActiveSale = (s: Sale) => s.status !== 'cancelled'

export function saleCostsCents(sale: Pick<Sale, 'costs'>): number {
  return sumCents(sale.costs.map((c) => c.amountCents))
}

export function summarizePeriod(ds: Pick<Dataset, 'receivables' | 'expenses' | 'sales'>, range: DateRange): PeriodSummary {
  const revenueCents = sumCents(
    ds.receivables.filter((r) => r.paidDate && isWithin(r.paidDate, range.start, range.end)).map((r) => r.amountCents),
  )
  const operatingExpensesCents = sumCents(
    ds.expenses.filter((e) => isWithin(e.date, range.start, range.end)).map((e) => e.amountCents),
  )
  const sales = ds.sales.filter((s) => isActiveSale(s) && isWithin(s.date, range.start, range.end))
  const projectCostsCents = sumCents(sales.map(saleCostsCents))
  const salesValueCents = sumCents(sales.map((s) => s.totalCents))
  const expensesCents = operatingExpensesCents + projectCostsCents
  const profitCents = revenueCents - expensesCents
  return {
    revenueCents,
    operatingExpensesCents,
    projectCostsCents,
    expensesCents,
    profitCents,
    margin: revenueCents > 0 ? profitCents / revenueCents : null,
    salesCount: sales.length,
    salesValueCents,
    averageTicketCents: sales.length > 0 ? Math.round(salesValueCents / sales.length) : 0,
  }
}

// ————————————————————————————————————————————— série mensal

export interface MonthlyPoint {
  month: MonthKey
  revenueCents: number
  operatingExpensesCents: number
  projectCostsCents: number
  expensesCents: number
  profitCents: number
  salesCount: number
  salesValueCents: number
}

export function monthlySeries(
  ds: Pick<Dataset, 'receivables' | 'expenses' | 'sales'>,
  from: MonthKey,
  to: MonthKey,
): MonthlyPoint[] {
  const months = monthRange(from, to)
  const buckets = new Map<MonthKey, MonthlyPoint>(
    months.map((m) => [
      m,
      {
        month: m,
        revenueCents: 0,
        operatingExpensesCents: 0,
        projectCostsCents: 0,
        expensesCents: 0,
        profitCents: 0,
        salesCount: 0,
        salesValueCents: 0,
      },
    ]),
  )
  for (const r of ds.receivables) {
    if (!r.paidDate) continue
    const b = buckets.get(monthKey(r.paidDate))
    if (b) b.revenueCents += r.amountCents
  }
  for (const e of ds.expenses) {
    const b = buckets.get(monthKey(e.date))
    if (b) b.operatingExpensesCents += e.amountCents
  }
  for (const s of ds.sales) {
    if (!isActiveSale(s)) continue
    const b = buckets.get(monthKey(s.date))
    if (!b) continue
    b.projectCostsCents += saleCostsCents(s)
    b.salesCount++
    b.salesValueCents += s.totalCents
  }
  for (const b of buckets.values()) {
    b.expensesCents = b.operatingExpensesCents + b.projectCostsCents
    b.profitCents = b.revenueCents - b.expensesCents
  }
  return months.map((m) => buckets.get(m)!)
}

/** Últimos `n` meses terminando no mês de `end` (ou no mês atual, se `end` estiver no futuro). */
export function trailingMonths(end: ISODate, today: ISODate, n = 12): { from: MonthKey; to: MonthKey } {
  const to = monthKey(end < today ? end : today)
  return { from: addMonthsToKey(to, -(n - 1)), to }
}

// ————————————————————————————————————————————— agrupamentos

export interface Ranked<K extends string = string> {
  key: K
  cents: number
  share: number
}

function rank<K extends string>(totals: Map<K, number>): Ranked<K>[] {
  const total = sumCents([...totals.values()])
  return [...totals.entries()]
    .filter(([, cents]) => cents > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, cents]) => ({ key, cents, share: total > 0 ? cents / total : 0 }))
}

export function revenueByService(ds: Pick<Dataset, 'receivables'>, index: DatasetIndex, range: DateRange): Ranked<ServiceType>[] {
  const totals = new Map<ServiceType, number>()
  for (const r of ds.receivables) {
    if (!r.paidDate || !isWithin(r.paidDate, range.start, range.end)) continue
    const key = receivableServiceType(r, index)
    totals.set(key, (totals.get(key) ?? 0) + r.amountCents)
  }
  return rank(totals)
}

export function revenueByClient(ds: Pick<Dataset, 'receivables'>, range: DateRange): Ranked[] {
  const totals = new Map<string, number>()
  for (const r of ds.receivables) {
    if (!r.paidDate || !isWithin(r.paidDate, range.start, range.end)) continue
    totals.set(r.clientId, (totals.get(r.clientId) ?? 0) + r.amountCents)
  }
  return rank(totals)
}

export function expensesByCategory(ds: Pick<Dataset, 'expenses'>, range: DateRange): Ranked<ExpenseCategory>[] {
  const totals = new Map<ExpenseCategory, number>()
  for (const e of ds.expenses) {
    if (!isWithin(e.date, range.start, range.end)) continue
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amountCents)
  }
  return rank(totals)
}

// ————————————————————————————————————————————— MRR e meta

export function isContractActiveOn(c: Contract, date: ISODate): boolean {
  return c.status === 'active' && c.startDate <= date && (!c.endDate || c.endDate >= date)
}

export function mrr(ds: Pick<Dataset, 'contracts'>, today: ISODate): { cents: number; activeCount: number } {
  const active = ds.contracts.filter((c) => isContractActiveOn(c, today))
  return { cents: sumCents(active.map((c) => c.monthlyCents)), activeCount: active.length }
}

export interface GoalProgress {
  month: MonthKey
  goalCents: number
  achievedCents: number
  ratio: number | null
}

export function goalProgress(ds: Pick<Dataset, 'receivables' | 'settings'>, today: ISODate): GoalProgress {
  const month = monthKey(today)
  const achievedCents = sumCents(
    ds.receivables.filter((r) => r.paidDate && monthKey(r.paidDate) === month).map((r) => r.amountCents),
  )
  const goalCents = ds.settings.monthlyGoalCents
  return { month, goalCents, achievedCents, ratio: goalCents > 0 ? achievedCents / goalCents : null }
}

// ————————————————————————————————————————————— próximos recebimentos

export interface UpcomingReceivable {
  receivable: Receivable
  state: 'open' | 'overdue'
}

export function upcomingReceivables(
  ds: Pick<Dataset, 'receivables'>,
  index: DatasetIndex,
  today: ISODate,
  limit = 6,
): UpcomingReceivable[] {
  const out: UpcomingReceivable[] = []
  for (const r of ds.receivables) {
    const state = receivableState(r, today, r.saleId ? index.sales.get(r.saleId) : null)
    if (state === 'open' || state === 'overdue') out.push({ receivable: r, state })
  }
  return out.sort((a, b) => a.receivable.dueDate.localeCompare(b.receivable.dueDate)).slice(0, limit)
}

// ————————————————————————————————————————————— funil

const FUNNEL_INDEX: Record<FunnelStage, number> = { lead: 0, proposal: 1, negotiation: 2, won: 3 }

export function funnelIndex(stage: FunnelStage): number {
  return FUNNEL_INDEX[stage]
}

export interface FunnelStep {
  stage: FunnelStage
  count: number
  valueCents: number
  /** Conversão a partir da etapa anterior. */
  rate: number | null
}

export interface FunnelData {
  steps: FunnelStep[]
  lostCount: number
  lostValueCents: number
  openCount: number
  openValueCents: number
  winRate: number | null
  total: number
}

export function proposalFunnel(proposals: readonly Proposal[], range?: DateRange): FunnelData {
  const list = range ? proposals.filter((p) => isWithin(p.createdDate, range.start, range.end)) : [...proposals]
  const steps: FunnelStep[] = FUNNEL_STAGES.map((stage, i) => {
    const reached = list.filter((p) => FUNNEL_INDEX[p.furthestStage] >= i)
    return { stage, count: reached.length, valueCents: sumCents(reached.map((p) => p.valueCents)), rate: null }
  })
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!
    steps[i]!.rate = prev.count > 0 ? steps[i]!.count / prev.count : null
  }
  const won = list.filter((p) => p.stage === 'won')
  const lost = list.filter((p) => p.stage === 'lost')
  const open = list.filter((p) => p.stage !== 'won' && p.stage !== 'lost')
  return {
    steps,
    lostCount: lost.length,
    lostValueCents: sumCents(lost.map((p) => p.valueCents)),
    openCount: open.length,
    openValueCents: sumCents(open.map((p) => p.valueCents)),
    winRate: won.length + lost.length > 0 ? won.length / (won.length + lost.length) : null,
    total: list.length,
  }
}

// ————————————————————————————————————————————— clientes

export interface ClientStats {
  clientId: string
  ltvCents: number
  soldCents: number
  openCents: number
  overdueCents: number
  salesCount: number
  activeContracts: number
  mrrCents: number
  firstDealDate: ISODate | null
  lastDealDate: ISODate | null
}

export function emptyClientStats(clientId: string): ClientStats {
  return {
    clientId,
    ltvCents: 0,
    soldCents: 0,
    openCents: 0,
    overdueCents: 0,
    salesCount: 0,
    activeContracts: 0,
    mrrCents: 0,
    firstDealDate: null,
    lastDealDate: null,
  }
}

export function clientStats(
  ds: Pick<Dataset, 'clients' | 'sales' | 'receivables' | 'contracts'>,
  today: ISODate,
): Map<string, ClientStats> {
  const index = indexDataset({ ...ds })
  const map = new Map<string, ClientStats>(ds.clients.map((c) => [c.id, emptyClientStats(c.id)]))
  const get = (id: string) => {
    let s = map.get(id)
    if (!s) {
      s = emptyClientStats(id)
      map.set(id, s)
    }
    return s
  }
  const touch = (s: ClientStats, date: ISODate) => {
    if (!s.firstDealDate || date < s.firstDealDate) s.firstDealDate = date
    if (!s.lastDealDate || date > s.lastDealDate) s.lastDealDate = date
  }
  for (const sale of ds.sales) {
    if (!isActiveSale(sale)) continue
    const s = get(sale.clientId)
    s.salesCount++
    s.soldCents += sale.totalCents
    touch(s, sale.date)
  }
  for (const c of ds.contracts) {
    const s = get(c.clientId)
    touch(s, c.startDate)
    if (isContractActiveOn(c, today)) {
      s.activeContracts++
      s.mrrCents += c.monthlyCents
    }
  }
  for (const r of ds.receivables) {
    const s = get(r.clientId)
    const state = receivableState(r, today, r.saleId ? index.sales.get(r.saleId) : null)
    if (state === 'paid') s.ltvCents += r.amountCents
    else if (state === 'open') s.openCents += r.amountCents
    else if (state === 'overdue') s.overdueCents += r.amountCents
    if (r.contractId && state !== 'void') s.soldCents += r.amountCents
  }
  return map
}

// ————————————————————————————————————————————— venda

export interface SaleSummary {
  installments: Receivable[]
  paidCents: number
  openCents: number
  overdueCents: number
  paidCount: number
  costsCents: number
  marginCents: number
  marginRatio: number | null
  progress: number
}

export function saleSummary(sale: Sale, receivables: readonly Receivable[], today: ISODate): SaleSummary {
  const installments = receivables
    .filter((r) => r.saleId === sale.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number)
  let paidCents = 0
  let openCents = 0
  let overdueCents = 0
  let paidCount = 0
  for (const r of installments) {
    const state = receivableState(r, today, sale)
    if (state === 'paid') {
      paidCents += r.amountCents
      paidCount++
    } else if (state === 'open') openCents += r.amountCents
    else if (state === 'overdue') overdueCents += r.amountCents
  }
  const costsCents = saleCostsCents(sale)
  const marginCents = sale.totalCents - costsCents
  return {
    installments,
    paidCents,
    openCents,
    overdueCents,
    paidCount,
    costsCents,
    marginCents,
    marginRatio: sale.totalCents > 0 ? marginCents / sale.totalCents : null,
    progress: sale.totalCents > 0 ? paidCents / sale.totalCents : 0,
  }
}

// ————————————————————————————————————————————— visão geral

export interface OverviewMetrics {
  current: PeriodSummary
  previous: PeriodSummary
  comparison: DateRange
  receivables: ReceivablesSnapshot
  mrr: { cents: number; activeCount: number }
  goal: GoalProgress
  monthly: MonthlyPoint[]
  byService: Ranked<ServiceType>[]
  topClients: Ranked[]
  upcoming: UpcomingReceivable[]
  funnel: FunnelData
}

export function overviewMetrics(ds: Dataset, range: DateRange, today: ISODate): OverviewMetrics {
  const index = indexDataset(ds)
  const comparison = comparisonRange(range, today)
  const { from, to } = trailingMonths(range.end, today, 12)
  return {
    current: summarizePeriod(ds, range),
    previous: summarizePeriod(ds, comparison),
    comparison,
    receivables: receivablesSnapshot(ds, index, today),
    mrr: mrr(ds, today),
    goal: goalProgress(ds, today),
    monthly: monthlySeries(ds, from, to),
    byService: revenueByService(ds, index, range),
    topClients: revenueByClient(ds, range).slice(0, 5),
    upcoming: upcomingReceivables(ds, index, today, 6),
    funnel: proposalFunnel(ds.proposals, range),
  }
}

export function hasAnyData(ds: Dataset): boolean {
  return (
    ds.clients.length > 0 ||
    ds.sales.length > 0 ||
    ds.expenses.length > 0 ||
    ds.contracts.length > 0 ||
    ds.proposals.length > 0 ||
    ds.receivables.length > 0
  )
}

// ————————————————————————————————————————————— relatório anual

export interface AnnualReport {
  year: number
  months: MonthlyPoint[]
  totals: PeriodSummary
  newClientsByMonth: number[]
  newClients: number
  byService: Ranked<ServiceType>[]
  byCategory: Ranked<ExpenseCategory>[]
  topClients: Ranked[]
}

export function annualReport(ds: Dataset, year: number, today: ISODate): AnnualReport {
  const range = { start: `${year}-01-01`, end: `${year}-12-31` }
  const index = indexDataset(ds)
  const months = monthlySeries(ds, `${year}-01`, `${year}-12`)
  const stats = clientStats(ds, today)
  const newClientsByMonth = Array.from({ length: 12 }, () => 0)
  for (const s of stats.values()) {
    if (s.firstDealDate && s.firstDealDate.startsWith(`${year}-`)) {
      const m = Number(s.firstDealDate.slice(5, 7)) - 1
      newClientsByMonth[m] = (newClientsByMonth[m] ?? 0) + 1
    }
  }
  return {
    year,
    months,
    totals: summarizePeriod(ds, range),
    newClientsByMonth,
    newClients: newClientsByMonth.reduce((a, b) => a + b, 0),
    byService: revenueByService(ds, index, range),
    byCategory: expensesByCategory(ds, range),
    topClients: revenueByClient(ds, range).slice(0, 10),
  }
}

/** Anos com algum lançamento, mais o ano atual, em ordem decrescente. */
export function yearsWithData(ds: Dataset, today: ISODate): number[] {
  const years = new Set<number>([Number(today.slice(0, 4))])
  const add = (d: string | null | undefined) => {
    if (d) years.add(Number(d.slice(0, 4)))
  }
  ds.sales.forEach((s) => add(s.date))
  ds.receivables.forEach((r) => add(r.paidDate))
  ds.expenses.forEach((e) => add(e.date))
  return [...years].sort((a, b) => b - a)
}
