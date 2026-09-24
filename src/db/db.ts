import Dexie, { type EntityTable } from 'dexie'
import type { Client, Contract, Expense, Proposal, Receivable, RecurringExpense, Sale, Settings } from '@/domain/types'

export class NexoraDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  sales!: EntityTable<Sale, 'id'>
  receivables!: EntityTable<Receivable, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  recurringExpenses!: EntityTable<RecurringExpense, 'id'>
  contracts!: EntityTable<Contract, 'id'>
  proposals!: EntityTable<Proposal, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'nexora') {
    super(name)
    this.version(1).stores({
      clients: 'id, name, createdAt',
      sales: 'id, clientId, date, status, serviceType, proposalId',
      receivables: 'id, clientId, saleId, contractId, dueDate, paidDate',
      expenses: 'id, date, category, recurringId',
      recurringExpenses: 'id',
      contracts: 'id, clientId, status',
      proposals: 'id, stage, clientId, createdDate, saleId',
      settings: 'id',
    })
  }

  get allTables() {
    return [
      this.clients,
      this.sales,
      this.receivables,
      this.expenses,
      this.recurringExpenses,
      this.contracts,
      this.proposals,
      this.settings,
    ]
  }
}

export const db = new NexoraDB()
