/**
 * Datas de calendário no formato 'YYYY-MM-DD' (sem fuso), e meses 'YYYY-MM'.
 * Toda a aritmética usa UTC internamente para não sofrer com horário de verão.
 */

export type ISODate = string
export type MonthKey = string

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/

export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const
export const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

export function toISODate(date: Date): ISODate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Hoje no fuso local do navegador. */
export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function parseISODate(iso: ISODate): { year: number; month: number; day: number } {
  const m = ISO_DATE_RE.exec(iso)
  if (!m) throw new Error(`Data inválida: ${iso}`)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false
  const m = ISO_DATE_RE.exec(value)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  return year >= 1900 && year <= 2999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

export function isValidMonthKey(value: unknown): value is MonthKey {
  if (typeof value !== 'string') return false
  const m = MONTH_KEY_RE.exec(value)
  if (!m) return false
  const month = Number(m[2])
  return month >= 1 && month <= 12
}

function toUTC(iso: ISODate): number {
  const { year, month, day } = parseISODate(iso)
  return Date.UTC(year, month - 1, day)
}

function fromUTC(ms: number): ISODate {
  const d = new Date(ms)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function makeISODate(year: number, month: number, day: number): ISODate {
  const clamped = Math.min(Math.max(1, day), daysInMonth(year, month))
  return `${pad(year, 4)}-${pad(month)}-${pad(clamped)}`
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTC(toUTC(iso) + days * 86_400_000)
}

/** Diferença em dias (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000)
}

/**
 * Soma meses mantendo o dia; se o mês de destino não tiver o dia, usa o último dia
 * (31/jan + 1 mês = 28 ou 29/fev).
 */
export function addMonths(iso: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(iso)
  const total = year * 12 + (month - 1) + months
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return makeISODate(y, m, day)
}

export function monthKey(iso: ISODate): MonthKey {
  return iso.slice(0, 7)
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const m = MONTH_KEY_RE.exec(key)
  if (!m) throw new Error(`Mês inválido: ${key}`)
  return { year: Number(m[1]), month: Number(m[2]) }
}

export function addMonthsToKey(key: MonthKey, months: number): MonthKey {
  const { year, month } = parseMonthKey(key)
  const total = year * 12 + (month - 1) + months
  return `${pad(Math.floor(total / 12), 4)}-${pad((total % 12) + 1)}`
}

export function monthStart(key: MonthKey): ISODate {
  return `${key}-01`
}

export function monthEnd(key: MonthKey): ISODate {
  const { year, month } = parseMonthKey(key)
  return makeISODate(year, month, 31)
}

/** Data do dia `day` no mês `key`, limitada ao último dia do mês. */
export function dateInMonth(key: MonthKey, day: number): ISODate {
  const { year, month } = parseMonthKey(key)
  return makeISODate(year, month, day)
}

/** Lista de meses de `from` até `to` (inclusive). */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  if (from > to) return out
  let cur = from
  while (cur <= to) {
    out.push(cur)
    cur = addMonthsToKey(cur, 1)
  }
  return out
}

export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const a = parseMonthKey(from)
  const b = parseMonthKey(to)
  return (b.year - a.year) * 12 + (b.month - a.month)
}

export function isWithin(iso: ISODate, start: ISODate, end: ISODate): boolean {
  return iso >= start && iso <= end
}

export function formatDate(iso: ISODate | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!iso || !isValidISODate(iso)) return '—'
  const { year, month, day } = parseISODate(iso)
  if (style === 'short') return `${pad(day)}/${pad(month)}/${year}`
  if (style === 'long') return `${day} de ${MONTHS_LONG[month - 1]} de ${year}`
  return `${pad(day)} ${MONTHS_SHORT[month - 1]} ${year}`
}

export function formatDayMonth(iso: ISODate): string {
  const { month, day } = parseISODate(iso)
  return `${pad(day)} ${MONTHS_SHORT[month - 1]}`
}

export function formatMonthKey(key: MonthKey, style: 'short' | 'long' = 'short'): string {
  const { year, month } = parseMonthKey(key)
  if (style === 'long') return `${MONTHS_LONG[month - 1]} de ${year}`
  return `${MONTHS_SHORT[month - 1]} ${String(year).slice(2)}`
}

export function weekdayLong(iso: ISODate): string {
  const names = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  return names[new Date(toUTC(iso)).getUTCDay()] ?? ''
}

/** Texto relativo para vencimentos: "hoje", "amanhã", "em 5 dias", "há 3 dias". */
export function relativeDays(iso: ISODate, today: ISODate): string {
  const d = diffDays(today, iso)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  if (d > 1) return `em ${d} dias`
  return `há ${-d} dias`
}
