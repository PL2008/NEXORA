import { describe, expect, it } from 'vitest'
import { formatBRL, formatCompactBRL, formatDecimal, parseBRL, relativeChange, splitCents, sumCents } from './money'

describe('formatBRL', () => {
  it('formata centavos em reais', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56')
    expect(formatBRL(0)).toBe('R$ 0,00')
    expect(formatBRL(5)).toBe('R$ 0,05')
    expect(formatBRL(-2500)).toBe('-R$ 25,00')
  })
  it('pode ocultar centavos', () => {
    expect(formatBRL(150000, { hideCents: true })).toBe('R$ 1.500')
  })
})

describe('formatCompactBRL', () => {
  it('compacta milhares e milhões', () => {
    expect(formatCompactBRL(0)).toBe('R$ 0')
    expect(formatCompactBRL(95000)).toBe('R$ 950')
    expect(formatCompactBRL(120000)).toBe('R$ 1,2 mil')
    expect(formatCompactBRL(15000000)).toBe('R$ 150 mil')
    expect(formatCompactBRL(340000000)).toBe('R$ 3,4 mi')
  })
})

describe('parseBRL', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['R$ 1.500', 150000],
    ['1.500', 150000],
    ['0,5', 50],
    ['10', 1000],
    [',99', 99],
    ['R$\u00a02.000,00', 200000],
  ])('%s → %i', (input, expected) => {
    expect(parseBRL(input)).toBe(expected)
  })
  it.each(['', 'abc', '1,2,3', '1,234', '-10', '12.34.5'])('rejeita %s', (input) => {
    expect(parseBRL(input)).toBeNull()
  })
})

describe('splitCents', () => {
  it('divide sem perder centavos', () => {
    expect(splitCents(1000, 3)).toEqual([334, 333, 333])
    expect(sumCents(splitCents(99999, 7))).toBe(99999)
    expect(splitCents(500, 1)).toEqual([500])
  })
  it('rejeita quantidade inválida', () => {
    expect(() => splitCents(100, 0)).toThrow()
  })
})

describe('relativeChange / formatDecimal', () => {
  it('calcula variação', () => {
    expect(relativeChange(150, 100)).toBeCloseTo(0.5)
    expect(relativeChange(50, 100)).toBeCloseTo(-0.5)
    expect(relativeChange(0, 0)).toBe(0)
    expect(relativeChange(10, 0)).toBeNull()
  })
  it('formata decimal', () => {
    expect(formatDecimal(123456)).toBe('1.234,56')
  })
})
