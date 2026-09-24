import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  addMonthsToKey,
  dateInMonth,
  diffDays,
  formatDate,
  formatMonthKey,
  isValidISODate,
  monthEnd,
  monthRange,
  relativeDays,
  toISODate,
} from './dates'

describe('dates', () => {
  it('valida datas ISO', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2028-02-29')).toBe(true)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('26-01-01')).toBe(false)
  })
  it('usa data local', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
  it('soma dias atravessando meses e anos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-01-01', '2026-12-31')).toBe(364)
  })
  it('soma meses limitando ao fim do mês', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
    expect(addMonths('2026-03-10', -3)).toBe('2025-12-10')
  })
  it('opera com meses', () => {
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01')
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12')
    expect(monthEnd('2024-02')).toBe('2024-02-29')
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28')
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
    expect(monthRange('2026-05', '2026-04')).toEqual([])
  })
  it('formata em pt-BR', () => {
    expect(formatDate('2026-09-04')).toBe('04 set 2026')
    expect(formatDate('2026-09-04', 'short')).toBe('04/09/2026')
    expect(formatDate('2026-09-04', 'long')).toBe('4 de setembro de 2026')
    expect(formatDate(null)).toBe('—')
    expect(formatMonthKey('2026-03')).toBe('mar 26')
    expect(formatMonthKey('2026-03', 'long')).toBe('março de 2026')
  })
  it('descreve dias relativos', () => {
    expect(relativeDays('2026-09-24', '2026-09-24')).toBe('hoje')
    expect(relativeDays('2026-09-25', '2026-09-24')).toBe('amanhã')
    expect(relativeDays('2026-09-29', '2026-09-24')).toBe('em 5 dias')
    expect(relativeDays('2026-09-20', '2026-09-24')).toBe('há 4 dias')
  })
})
