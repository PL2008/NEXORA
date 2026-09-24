import { addMonthsToKey, dateInMonth, monthKey, monthRange, parseISODate, type ISODate } from '@/lib/dates'
import { createId, nowTimestamp } from '@/lib/id'
import type { Contract, Expense, Receivable, RecurringExpense } from './types'

export interface ContractGeneration {
  charges: Receivable[]
  lastGeneratedMonth: Contract['lastGeneratedMonth']
}

/** Data de vencimento da cobrança do contrato no mês informado. */
export function contractDueDate(contract: Pick<Contract, 'billingDay'>, month: string): ISODate {
  return dateInMonth(month, contract.billingDay)
}

/**
 * Cobranças mensais pendentes de geração para um contrato, até o mês de `today`
 * (inclusive). Só gera para contratos ativos; respeita início e fim do contrato.
 * `paidBefore` marca como pagas as cobranças com vencimento anterior a essa data.
 */
export function pendingContractCharges(
  contract: Contract,
  today: ISODate,
  options: { paidBefore?: ISODate } = {},
): ContractGeneration {
  const current = monthKey(today)
  if (contract.status !== 'active') return { charges: [], lastGeneratedMonth: contract.lastGeneratedMonth }
  const firstMonth = contract.lastGeneratedMonth ? addMonthsToKey(contract.lastGeneratedMonth, 1) : monthKey(contract.startDate)
  const endMonth = contract.endDate && monthKey(contract.endDate) < current ? monthKey(contract.endDate) : current
  const charges: Receivable[] = []
  for (const month of monthRange(firstMonth, endMonth)) {
    const dueDate = contractDueDate(contract, month)
    if (dueDate < contract.startDate) continue
    if (contract.endDate && dueDate > contract.endDate) continue
    const paid = options.paidBefore !== undefined && dueDate < options.paidBefore
    charges.push({
      id: createId(),
      clientId: contract.clientId,
      saleId: null,
      contractId: contract.id,
      periodKey: month,
      number: 1,
      count: 1,
      amountCents: contract.monthlyCents,
      dueDate,
      paidDate: paid ? dueDate : null,
      createdAt: nowTimestamp(),
    })
  }
  const last = endMonth >= firstMonth ? endMonth : contract.lastGeneratedMonth
  return { charges, lastGeneratedMonth: last }
}

export interface RecurringExpenseGeneration {
  expenses: Expense[]
  lastGeneratedMonth: RecurringExpense['lastGeneratedMonth']
}

/** Lançamentos pendentes de uma despesa recorrente até o mês de `today` (inclusive). */
export function pendingRecurringExpenses(rule: RecurringExpense, today: ISODate): RecurringExpenseGeneration {
  const current = monthKey(today)
  if (!rule.active) return { expenses: [], lastGeneratedMonth: rule.lastGeneratedMonth }
  const firstMonth = rule.lastGeneratedMonth ? addMonthsToKey(rule.lastGeneratedMonth, 1) : monthKey(rule.startDate)
  const endMonth = rule.endDate && monthKey(rule.endDate) < current ? monthKey(rule.endDate) : current
  const { day } = parseISODate(rule.startDate)
  const expenses: Expense[] = []
  for (const month of monthRange(firstMonth, endMonth)) {
    const date = dateInMonth(month, day)
    if (date < rule.startDate) continue
    if (rule.endDate && date > rule.endDate) continue
    expenses.push({
      id: createId(),
      description: rule.description,
      category: rule.category,
      amountCents: rule.amountCents,
      date,
      recurringId: rule.id,
      notes: '',
      createdAt: nowTimestamp(),
    })
  }
  const last = endMonth >= firstMonth ? endMonth : rule.lastGeneratedMonth
  return { expenses, lastGeneratedMonth: last }
}

/** Próximo vencimento de um contrato ativo a partir de `today`. */
export function nextContractDueDate(contract: Contract, today: ISODate): ISODate | null {
  if (contract.status !== 'active') return null
  let month = monthKey(today > contract.startDate ? today : contract.startDate)
  for (let i = 0; i < 3; i++) {
    const due = contractDueDate(contract, month)
    if (due >= today && due >= contract.startDate) {
      return contract.endDate && due > contract.endDate ? null : due
    }
    month = addMonthsToKey(month, 1)
  }
  return null
}
