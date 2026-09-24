import { addMonths, type ISODate } from '@/lib/dates'
import { splitCents, sumCents } from '@/lib/money'
import type { PaymentMode } from './types'

export interface InstallmentDraft {
  /** Presente quando a parcela já existe no banco. */
  id?: string
  amountCents: number
  dueDate: ISODate
  paidDate: ISODate | null
}

export const MAX_INSTALLMENTS = 60

/** Gera o plano de parcelas: à vista (1) ou parcelado mensalmente a partir da 1ª data. */
export function buildInstallmentPlan(totalCents: number, count: number, firstDueDate: ISODate): InstallmentDraft[] {
  const n = Math.min(Math.max(1, Math.floor(count)), MAX_INSTALLMENTS)
  return splitCents(totalCents, n).map((amountCents, i) => ({
    amountCents,
    dueDate: addMonths(firstDueDate, i),
    paidDate: null,
  }))
}

export function planForMode(mode: PaymentMode, totalCents: number, count: number, firstDueDate: ISODate): InstallmentDraft[] {
  return buildInstallmentPlan(totalCents, mode === 'single' ? 1 : count, firstDueDate)
}

export function installmentsDifference(totalCents: number, installments: readonly { amountCents: number }[]): number {
  return totalCents - sumCents(installments.map((i) => i.amountCents))
}

/** Ordena por vencimento e numera (1/N, 2/N…). */
export function sortInstallments<T extends { dueDate: ISODate }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}
