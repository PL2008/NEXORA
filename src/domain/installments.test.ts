import { describe, expect, it } from 'vitest'
import { buildInstallmentPlan, installmentsDifference, planForMode } from './installments'

describe('parcelas', () => {
  it('à vista gera uma parcela com o total', () => {
    expect(planForMode('single', 500000, 6, '2026-09-10')).toEqual([
      { amountCents: 500000, dueDate: '2026-09-10', paidDate: null },
    ])
  })
  it('parcelado distribui centavos e vence mensalmente', () => {
    const plan = buildInstallmentPlan(100000, 3, '2026-01-31')
    expect(plan.map((p) => p.amountCents)).toEqual([33334, 33333, 33333])
    expect(plan.map((p) => p.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(installmentsDifference(100000, plan)).toBe(0)
  })
  it('calcula diferença para o total', () => {
    expect(installmentsDifference(1000, [{ amountCents: 400 }, { amountCents: 500 }])).toBe(100)
  })
})
