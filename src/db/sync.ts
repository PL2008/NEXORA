import { todayISO, type ISODate } from '@/lib/dates'
import { pendingContractCharges, pendingRecurringExpenses } from '@/domain/recurring'
import type { NexoraDB } from './db'

/**
 * Gera as cobranças mensais de contratos e os lançamentos de despesas recorrentes
 * que ainda não existem, até o mês atual. Idempotente: usa `lastGeneratedMonth`.
 */
export async function syncRecurring(
  database: NexoraDB,
  today: ISODate = todayISO(),
): Promise<{ charges: number; expenses: number }> {
  return database.transaction(
    'rw',
    [database.contracts, database.receivables, database.recurringExpenses, database.expenses],
    async () => {
      let charges = 0
      let expenses = 0
      const contracts = await database.contracts.where('status').equals('active').toArray()
      for (const contract of contracts) {
        const gen = pendingContractCharges(contract, today)
        if (gen.charges.length > 0) {
          await database.receivables.bulkAdd(gen.charges)
          charges += gen.charges.length
        }
        if (gen.lastGeneratedMonth !== contract.lastGeneratedMonth) {
          await database.contracts.update(contract.id, { lastGeneratedMonth: gen.lastGeneratedMonth })
        }
      }
      const rules = await database.recurringExpenses.toArray()
      for (const rule of rules) {
        const gen = pendingRecurringExpenses(rule, today)
        if (gen.expenses.length > 0) {
          await database.expenses.bulkAdd(gen.expenses)
          expenses += gen.expenses.length
        }
        if (gen.lastGeneratedMonth !== rule.lastGeneratedMonth) {
          await database.recurringExpenses.update(rule.id, { lastGeneratedMonth: gen.lastGeneratedMonth })
        }
      }
      return { charges, expenses }
    },
  )
}
