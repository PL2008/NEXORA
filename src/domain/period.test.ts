import { describe, expect, it } from 'vitest'
import { comparisonLabel, comparisonRange, resolvePeriod } from './period'

const today = '2026-09-24'

describe('resolvePeriod', () => {
  it('resolve presets de calendário', () => {
    expect(resolvePeriod('this-month', today)).toMatchObject({ start: '2026-09-01', end: '2026-09-30' })
    expect(resolvePeriod('last-month', today)).toMatchObject({ start: '2026-08-01', end: '2026-08-31' })
    expect(resolvePeriod('last-3-months', today)).toMatchObject({ start: '2026-07-01', end: '2026-09-30' })
    expect(resolvePeriod('last-12-months', today)).toMatchObject({ start: '2025-10-01', end: '2026-09-30' })
    expect(resolvePeriod('this-year', today)).toMatchObject({ start: '2026-01-01', end: '2026-12-31' })
    expect(resolvePeriod('last-year', today)).toMatchObject({ start: '2025-01-01', end: '2025-12-31' })
  })
  it('normaliza intervalo personalizado invertido', () => {
    const p = resolvePeriod('custom', today, { start: '2026-09-20', end: '2026-09-10' })
    expect(p).toMatchObject({ start: '2026-09-10', end: '2026-09-20', label: '10/09/2026 – 20/09/2026' })
  })
  it('usa padrão quando personalizado é inválido', () => {
    expect(resolvePeriod('custom', today, { start: 'x' })).toMatchObject({ start: '2026-09-01', end: today })
  })
})

describe('comparisonRange', () => {
  it('compara mês em andamento até o mesmo dia', () => {
    expect(comparisonRange({ start: '2026-09-01', end: '2026-09-30' }, today)).toEqual({ start: '2026-08-01', end: '2026-08-24' })
    expect(comparisonLabel({ start: '2026-09-01', end: '2026-09-30' }, today)).toBe('vs 1–24 de agosto')
  })
  it('compara mês fechado com o mês anterior inteiro', () => {
    expect(comparisonRange({ start: '2026-08-01', end: '2026-08-31' }, today)).toEqual({ start: '2026-07-01', end: '2026-07-31' })
    expect(comparisonLabel({ start: '2026-08-01', end: '2026-08-31' }, today)).toBe('vs julho de 2026')
  })
  it('limita o dia ao tamanho do mês anterior', () => {
    expect(comparisonRange({ start: '2026-03-01', end: '2026-03-31' }, '2026-03-30')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
  })
  it('compara ano em andamento com o mesmo ponto do ano anterior', () => {
    expect(comparisonRange({ start: '2026-01-01', end: '2026-12-31' }, today)).toEqual({ start: '2025-01-01', end: '2025-09-24' })
  })
  it('compara intervalos em dias', () => {
    expect(comparisonRange({ start: '2026-09-10', end: '2026-09-19' }, '2026-10-01')).toEqual({
      start: '2026-08-31',
      end: '2026-09-09',
    })
    expect(comparisonRange({ start: '2026-09-10', end: '2026-09-29' }, '2026-09-14')).toEqual({
      start: '2026-08-21',
      end: '2026-08-25',
    })
  })
})
