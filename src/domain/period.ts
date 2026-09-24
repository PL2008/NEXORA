import {
  addDays,
  addMonths,
  addMonthsToKey,
  diffDays,
  formatDate,
  formatMonthKey,
  isValidISODate,
  monthEnd,
  monthKey,
  monthStart,
  monthsBetween,
  MONTHS_LONG,
  parseISODate,
  type ISODate,
} from '@/lib/dates'

export const PERIOD_PRESETS = [
  'this-month',
  'last-month',
  'last-3-months',
  'last-6-months',
  'last-12-months',
  'this-year',
  'last-year',
  'custom',
] as const
export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

export const PERIOD_PRESET_LABEL: Record<PeriodPreset, string> = {
  'this-month': 'Este mês',
  'last-month': 'Mês passado',
  'last-3-months': 'Últimos 3 meses',
  'last-6-months': 'Últimos 6 meses',
  'last-12-months': 'Últimos 12 meses',
  'this-year': 'Este ano',
  'last-year': 'Ano passado',
  custom: 'Personalizado',
}

export interface DateRange {
  start: ISODate
  end: ISODate
}

export interface Period extends DateRange {
  preset: PeriodPreset
  label: string
}

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return typeof value === 'string' && (PERIOD_PRESETS as readonly string[]).includes(value)
}

function lastMonths(today: ISODate, n: number): DateRange {
  const cur = monthKey(today)
  return { start: monthStart(addMonthsToKey(cur, -(n - 1))), end: monthEnd(cur) }
}

export function resolvePeriod(preset: PeriodPreset, today: ISODate, custom?: Partial<DateRange>): Period {
  const cur = monthKey(today)
  const { year } = parseISODate(today)
  let range: DateRange
  switch (preset) {
    case 'this-month':
      range = { start: monthStart(cur), end: monthEnd(cur) }
      break
    case 'last-month': {
      const prev = addMonthsToKey(cur, -1)
      range = { start: monthStart(prev), end: monthEnd(prev) }
      break
    }
    case 'last-3-months':
      range = lastMonths(today, 3)
      break
    case 'last-6-months':
      range = lastMonths(today, 6)
      break
    case 'last-12-months':
      range = lastMonths(today, 12)
      break
    case 'this-year':
      range = { start: `${year}-01-01`, end: `${year}-12-31` }
      break
    case 'last-year':
      range = { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` }
      break
    case 'custom': {
      const start = custom?.start && isValidISODate(custom.start) ? custom.start : monthStart(cur)
      const end = custom?.end && isValidISODate(custom.end) ? custom.end : today
      range = start <= end ? { start, end } : { start: end, end: start }
      break
    }
  }
  const label =
    preset === 'custom' ? `${formatDate(range.start, 'short')} – ${formatDate(range.end, 'short')}` : PERIOD_PRESET_LABEL[preset]
  return { preset, label, ...range }
}

/** O intervalo cobre meses inteiros (do dia 1 ao último dia)? */
function isWholeMonths(range: DateRange): boolean {
  return range.start.endsWith('-01') && range.end === monthEnd(monthKey(range.end))
}

/**
 * Período anterior equivalente, para comparação. Quando o período atual ainda está
 * em andamento, compara apenas até o mesmo ponto (ex.: 1–24/set vs 1–24/ago).
 */
export function comparisonRange(range: DateRange, today: ISODate): DateRange {
  const inProgress = today >= range.start && today < range.end
  if (isWholeMonths(range)) {
    const n = monthsBetween(monthKey(range.start), monthKey(range.end)) + 1
    const start = addMonths(range.start, -n)
    const end = inProgress ? addMonths(today, -n) : monthEnd(addMonthsToKey(monthKey(range.end), -n))
    return { start, end }
  }
  const length = diffDays(range.start, range.end) + 1
  const start = addDays(range.start, -length)
  const end = inProgress ? addDays(start, diffDays(range.start, today)) : addDays(range.start, -1)
  return { start, end }
}

export function comparisonLabel(range: DateRange, today: ISODate): string {
  const prev = comparisonRange(range, today)
  const a = parseISODate(prev.start)
  const b = parseISODate(prev.end)
  if (a.year === b.year && a.month === b.month) {
    if (a.day === 1 && prev.end === monthEnd(monthKey(prev.end))) return `vs ${formatMonthKey(monthKey(prev.start), 'long')}`
    return `vs ${a.day}–${b.day} de ${MONTHS_LONG[a.month - 1]}`
  }
  return `vs ${formatDate(prev.start, 'short')} – ${formatDate(prev.end, 'short')}`
}
