import { describe, expect, it } from 'vitest'
import { contract as makeContract } from '@/test/factories'
import type { RecurringExpense } from './types'
import { nextContractDueDate, pendingContractCharges, pendingRecurringExpenses } from './recurring'

describe('cobranças de contratos', () => {
  const base = makeContract({ clientId: 'c1', startDate: '2026-07-15', billingDay: 10 })

  it('gera a partir do primeiro vencimento após o início até o mês atual', () => {
    const gen = pendingContractCharges(base, '2026-09-24')
    expect(gen.charges.map((c) => c.dueDate)).toEqual(['2026-08-10', '2026-09-10'])
    expect(gen.charges.map((c) => c.periodKey)).toEqual(['2026-08', '2026-09'])
    expect(gen.charges.every((c) => c.contractId === base.id && c.amountCents === 50000 && c.paidDate === null)).toBe(true)
    expect(gen.lastGeneratedMonth).toBe('2026-09')
  })
  it('é idempotente a partir de lastGeneratedMonth', () => {
    const gen = pendingContractCharges({ ...base, lastGeneratedMonth: '2026-09' }, '2026-09-30')
    expect(gen.charges).toHaveLength(0)
    expect(pendingContractCharges({ ...base, lastGeneratedMonth: '2026-09' }, '2026-10-01').charges).toHaveLength(1)
  })
  it('respeita o término e o status', () => {
    expect(pendingContractCharges({ ...base, endDate: '2026-08-31' }, '2026-12-01').charges.map((c) => c.dueDate)).toEqual([
      '2026-08-10',
    ])
    expect(pendingContractCharges({ ...base, status: 'paused' }, '2026-12-01').charges).toHaveLength(0)
  })
  it('limita dia 31 ao fim do mês e marca passadas como pagas se pedido', () => {
    const gen = pendingContractCharges({ ...base, startDate: '2026-01-31', billingDay: 31 }, '2026-03-05', {
      paidBefore: '2026-03-05',
    })
    expect(gen.charges.map((c) => [c.dueDate, c.paidDate])).toEqual([
      ['2026-01-31', '2026-01-31'],
      ['2026-02-28', '2026-02-28'],
      ['2026-03-31', null],
    ])
  })
  it('não gera nada para contrato que começa no futuro', () => {
    const gen = pendingContractCharges({ ...base, startDate: '2026-11-01' }, '2026-09-24')
    expect(gen.charges).toHaveLength(0)
    expect(gen.lastGeneratedMonth).toBeNull()
  })
  it('calcula o próximo vencimento', () => {
    expect(nextContractDueDate(base, '2026-09-24')).toBe('2026-10-10')
    expect(nextContractDueDate(base, '2026-09-05')).toBe('2026-09-10')
    expect(nextContractDueDate({ ...base, status: 'paused' }, '2026-09-05')).toBeNull()
  })
})

describe('despesas recorrentes', () => {
  const rule: RecurringExpense = {
    id: 'rule',
    description: 'Figma',
    category: 'software',
    amountCents: 7500,
    startDate: '2026-06-20',
    endDate: null,
    active: true,
    lastGeneratedMonth: null,
    createdAt: '',
  }
  it('gera um lançamento por mês até o mês atual', () => {
    const gen = pendingRecurringExpenses(rule, '2026-09-01')
    expect(gen.expenses.map((e) => e.date)).toEqual(['2026-06-20', '2026-07-20', '2026-08-20', '2026-09-20'])
    expect(gen.expenses.every((e) => e.recurringId === 'rule')).toBe(true)
    expect(gen.lastGeneratedMonth).toBe('2026-09')
  })
  it('não gera quando inativa ou após o fim', () => {
    expect(pendingRecurringExpenses({ ...rule, active: false }, '2026-09-01').expenses).toHaveLength(0)
    expect(pendingRecurringExpenses({ ...rule, endDate: '2026-07-31' }, '2026-09-01').expenses.map((e) => e.date)).toEqual([
      '2026-06-20',
      '2026-07-20',
    ])
  })
})
