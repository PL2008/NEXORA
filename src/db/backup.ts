import { z } from 'zod'
import { nowTimestamp } from '@/lib/id'
import {
  clientSchema,
  contractSchema,
  expenseSchema,
  proposalSchema,
  receivableSchema,
  recurringExpenseSchema,
  saleSchema,
  settingsSchema,
} from '@/domain/schemas'
import type { Dataset } from '@/domain/types'
import { db as defaultDb, type NexoraDB } from './db'
import { DomainError, loadDataset } from './repo'

export const BACKUP_APP = 'nexora-gestao'
export const BACKUP_VERSION = 1

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  data: z.object({
    clients: z.array(clientSchema),
    sales: z.array(saleSchema),
    receivables: z.array(receivableSchema),
    expenses: z.array(expenseSchema),
    recurringExpenses: z.array(recurringExpenseSchema),
    contracts: z.array(contractSchema),
    proposals: z.array(proposalSchema),
    settings: settingsSchema.nullable(),
  }),
})

export type Backup = z.infer<typeof backupSchema>

export async function createBackup(database: NexoraDB = defaultDb): Promise<Backup> {
  const ds = await loadDataset(database)
  const settings = await database.settings.get('app')
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: nowTimestamp(),
    data: {
      clients: ds.clients,
      sales: ds.sales,
      receivables: ds.receivables,
      expenses: ds.expenses,
      recurringExpenses: ds.recurringExpenses,
      contracts: ds.contracts,
      proposals: ds.proposals,
      settings: settings ?? null,
    },
  }
}

/** Valida o conteúdo e a integridade referencial de um backup. */
export function parseBackup(raw: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new DomainError('O arquivo não é um JSON válido.')
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue ? issue.path.join('.') : ''
    throw new DomainError(`Backup inválido${where ? ` (${where})` : ''}: ${issue?.message ?? 'formato desconhecido'}.`)
  }
  const { data } = result.data
  const clientIds = new Set(data.clients.map((c) => c.id))
  const saleIds = new Set(data.sales.map((s) => s.id))
  const contractIds = new Set(data.contracts.map((c) => c.id))
  const ensureUnique = (name: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) throw new DomainError(`Backup inválido: IDs duplicados em ${name}.`)
  }
  ensureUnique(
    'clientes',
    data.clients.map((c) => c.id),
  )
  ensureUnique(
    'vendas',
    data.sales.map((s) => s.id),
  )
  ensureUnique(
    'recebimentos',
    data.receivables.map((r) => r.id),
  )
  ensureUnique(
    'despesas',
    data.expenses.map((e) => e.id),
  )
  ensureUnique(
    'contratos',
    data.contracts.map((c) => c.id),
  )
  ensureUnique(
    'propostas',
    data.proposals.map((p) => p.id),
  )
  for (const s of data.sales) {
    if (!clientIds.has(s.clientId)) throw new DomainError('Backup inválido: venda sem cliente correspondente.')
  }
  for (const c of data.contracts) {
    if (!clientIds.has(c.clientId)) throw new DomainError('Backup inválido: contrato sem cliente correspondente.')
  }
  for (const r of data.receivables) {
    if (!clientIds.has(r.clientId)) throw new DomainError('Backup inválido: recebimento sem cliente correspondente.')
    if (r.saleId && !saleIds.has(r.saleId)) throw new DomainError('Backup inválido: parcela sem venda correspondente.')
    if (r.contractId && !contractIds.has(r.contractId)) {
      throw new DomainError('Backup inválido: cobrança sem contrato correspondente.')
    }
  }
  return result.data
}

export async function restoreBackup(backup: Backup, database: NexoraDB = defaultDb): Promise<void> {
  const { data } = backup
  await database.transaction('rw', database.allTables, async () => {
    await Promise.all(database.allTables.map((t) => t.clear()))
    await database.clients.bulkAdd(data.clients)
    await database.sales.bulkAdd(data.sales)
    await database.receivables.bulkAdd(data.receivables)
    await database.expenses.bulkAdd(data.expenses)
    await database.recurringExpenses.bulkAdd(data.recurringExpenses)
    await database.contracts.bulkAdd(data.contracts)
    await database.proposals.bulkAdd(data.proposals)
    if (data.settings) await database.settings.put(data.settings)
  })
}

export function backupSummary(data: Pick<Dataset, 'clients' | 'sales' | 'expenses' | 'contracts' | 'proposals'>): string {
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return [
    count(data.clients.length, 'cliente', 'clientes'),
    count(data.sales.length, 'venda', 'vendas'),
    count(data.expenses.length, 'despesa', 'despesas'),
    count(data.contracts.length, 'contrato', 'contratos'),
    count(data.proposals.length, 'proposta', 'propostas'),
  ].join(' · ')
}
