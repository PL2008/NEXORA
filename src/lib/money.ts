/** Valores monetários sempre em centavos (inteiros). Formatação pt-BR / BRL. */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlNoCents = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('pt-BR')
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

/** Troca o espaço não separável do Intl por espaço comum (mais previsível em testes e CSV). */
const normalizeSpaces = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

export function formatBRL(cents: number, opts: { hideCents?: boolean } = {}): string {
  const value = cents / 100
  return normalizeSpaces((opts.hideCents ? brlNoCents : brl).format(value === 0 ? 0 : value))
}

/** Formato compacto para eixos: R$ 0, R$ 950, R$ 1,2 mil, R$ 3,4 mi. */
export function formatCompactBRL(cents: number): string {
  const value = cents / 100
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: n >= 100 ? 0 : 1 }).format(n)
  if (abs >= 1_000_000_000) return `${sign}R$ ${fmt(abs / 1_000_000_000)} bi`
  if (abs >= 1_000_000) return `${sign}R$ ${fmt(abs / 1_000_000)} mi`
  if (abs >= 1_000) return `${sign}R$ ${fmt(abs / 1_000)} mil`
  return `${sign}R$ ${integer.format(Math.round(abs))}`
}

/** "1.234,56" — para campos de formulário e CSV. */
export function formatDecimal(cents: number): string {
  return normalizeSpaces(decimal.format(cents / 100))
}

export function formatInteger(n: number): string {
  return integer.format(n)
}

export function formatPercent(ratio: number): string {
  return normalizeSpaces(percent.format(ratio))
}

/**
 * Converte texto digitado em centavos. Aceita "1.234,56", "1234,56", "1234.56",
 * "R$ 1.500", "1.500" (milhar). Retorna null se não for um valor válido ≥ 0.
 */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$/gi, '').replace(/[\s\u00a0\u202f]/g, '')
  if (s === '') return null
  if (!/^[\d.,]+$/.test(s)) return null
  let intPart: string
  let fracPart = ''
  if (s.includes(',')) {
    const parts = s.split(',')
    if (parts.length !== 2) return null
    intPart = (parts[0] ?? '').replace(/\./g, '')
    fracPart = parts[1] ?? ''
    if (/\./.test(fracPart)) return null
  } else if (s.includes('.')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      intPart = s.replace(/\./g, '')
    } else {
      const parts = s.split('.')
      if (parts.length !== 2) return null
      intPart = parts[0] ?? ''
      fracPart = parts[1] ?? ''
    }
  } else {
    intPart = s
  }
  s = intPart
  if (s === '') s = '0'
  if (!/^\d+$/.test(s) || !/^\d*$/.test(fracPart) || fracPart.length > 2) return null
  const cents = Number(s) * 100 + Number(fracPart.padEnd(2, '0') || '0')
  return Number.isSafeInteger(cents) ? cents : null
}

export function sumCents(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}

/** Divide um total em `n` partes inteiras; os centavos que sobram vão para as primeiras parcelas. */
export function splitCents(total: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1) throw new Error('Quantidade de parcelas inválida')
  const base = Math.floor(total / n)
  const remainder = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0))
}

/** Variação relativa entre dois valores; null quando não há base de comparação. */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / Math.abs(previous)
}
