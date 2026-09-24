import {
  DEFAULT_SETTINGS,
  type Client,
  type Contract,
  type Dataset,
  type Expense,
  type Proposal,
  type Receivable,
  type Sale,
} from '@/domain/types'

/** Fábricas mínimas usadas apenas nos testes automatizados. */
let seq = 0
const nextId = (p: string) => `${p}-${++seq}`

export function client(p: Partial<Client> = {}): Client {
  return { id: nextId('c'), name: 'Cliente', company: '', email: '', phone: '', document: '', notes: '', createdAt: '', ...p }
}

export function sale(p: Partial<Sale> & Pick<Sale, 'clientId'>): Sale {
  return {
    id: nextId('s'),
    title: 'Projeto',
    serviceType: 'institutional_site',
    totalCents: 100000,
    date: '2026-09-01',
    status: 'in_progress',
    deadline: null,
    paymentMode: 'single',
    costs: [],
    notes: '',
    proposalId: null,
    createdAt: '',
    updatedAt: '',
    ...p,
  }
}

export function receivable(p: Partial<Receivable> & Pick<Receivable, 'clientId'>): Receivable {
  return {
    id: nextId('r'),
    saleId: null,
    contractId: null,
    periodKey: null,
    number: 1,
    count: 1,
    amountCents: 100000,
    dueDate: '2026-09-10',
    paidDate: null,
    createdAt: '',
    ...p,
  }
}

export function expense(p: Partial<Expense> = {}): Expense {
  return {
    id: nextId('e'),
    description: 'Despesa',
    category: 'software',
    amountCents: 10000,
    date: '2026-09-05',
    recurringId: null,
    notes: '',
    createdAt: '',
    ...p,
  }
}

export function contract(p: Partial<Contract> & Pick<Contract, 'clientId'>): Contract {
  return {
    id: nextId('k'),
    description: 'Manutenção mensal',
    serviceType: 'maintenance',
    monthlyCents: 50000,
    billingDay: 10,
    startDate: '2026-01-01',
    endDate: null,
    status: 'active',
    lastGeneratedMonth: null,
    notes: '',
    createdAt: '',
    ...p,
  }
}

export function proposal(p: Partial<Proposal> = {}): Proposal {
  return {
    id: nextId('p'),
    title: 'Proposta',
    clientId: null,
    leadName: 'Lead',
    leadEmail: '',
    leadPhone: '',
    serviceType: 'landing_page',
    valueCents: 200000,
    stage: 'lead',
    furthestStage: 'lead',
    createdDate: '2026-09-01',
    expectedCloseDate: null,
    closedDate: null,
    lostReason: '',
    notes: '',
    saleId: null,
    createdAt: '',
    updatedAt: '',
    ...p,
  }
}

export function dataset(p: Partial<Dataset> = {}): Dataset {
  return {
    clients: [],
    sales: [],
    receivables: [],
    expenses: [],
    recurringExpenses: [],
    contracts: [],
    proposals: [],
    settings: DEFAULT_SETTINGS,
    ...p,
  }
}
