import { describe, expect, it } from 'vitest'
import { niceScale } from './scale'

describe('niceScale', () => {
  it('gera ticks redondos', () => {
    expect(niceScale(0, 1_234_500).ticks).toEqual([0, 500_000, 1_000_000, 1_500_000])
    expect(niceScale(0, 870).ticks).toEqual([0, 250, 500, 750, 1000])
  })
  it('lida com zero e negativos', () => {
    expect(niceScale(0, 0)).toEqual({ min: 0, max: 1, ticks: [0] })
    const s = niceScale(-300, 900)
    expect(s.min).toBeLessThanOrEqual(-300)
    expect(s.max).toBeGreaterThanOrEqual(900)
    expect(s.ticks).toContain(0)
  })
})
