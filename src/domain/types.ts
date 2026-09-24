import type { ISODate, MonthKey } from '@/lib/dates'

export const SERVICE_TYPES = [
  'institutional_site',
  'landing_page',
  'ecommerce',
  'mobile_app',
  'web_system',
  'saas',
  'maintenance',
  'hosting',
  'design',
  'consulting',
  'other',
] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export const PROJECT_STATUSES = ['not_started', 'in_progress', 'in_review', 'delivered', 'cancelled'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PAYMENT_MODES = ['single', 'installments', 'custom'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

export const PROPOSAL_STAGES = ['lead', 'proposal', 'negotiation', 'won', 'lost'] as const
export type ProposalStage = (typeof PROPOSAL_STAGES)[number]
/** Etapas do funil em ordem (sem "perdida"). */
export const FUNNEL_STAGES = ['lead', 'proposal', 'negotiation', 'won'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const CONTRACT_STATUSES = ['active', 'paused', 'ended'] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const EXPENSE_CATEGORIES = [
  'software',
  'hosting',
  'marketing',
  'taxes',
  'payroll',
  'freelancers',
  'equipment',
  'office',
  'fees',
  'education',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const THEMES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEMES)[number]

export interface Client {
  id: string
  name: string
  company: string
  email: string
  phone: string
  document: string
  notes: string
  createdAt: string
}

export interface ProjectCost {
  id: string
  description: string
  amountCents: number
}

export interface Sale {
  id: string
  clientId: string
  title: string
  serviceType: ServiceType
  totalCents: number
  date: ISODate
  status: ProjectStatus
  deadline: ISODate | null
  paymentMode: PaymentMode
  costs: ProjectCost[]
  notes: string
  proposalId: string | null
  createdAt: string
  updatedAt: string
}

/** Parcela a receber — de uma venda ou cobrança mensal de um contrato. */
export interface Receivable {
  id: string
  clientId: string
  saleId: string | null
  contractId: string | null
  /** 'YYYY-MM' da competência, para cobranças de contrato. */
  periodKey: MonthKey | null
  number: number
  count: number
  amountCents: number
  dueDate: ISODate
  paidDate: ISODate | null
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amountCents: number
  date: ISODate
  recurringId: string | null
  notes: string
  createdAt: string
}

export interface RecurringExpense {
  id: string
  description: string
  category: ExpenseCategory
  amountCents: number
  /** Primeira ocorrência; o dia do mês se repete nos meses seguintes. */
  startDate: ISODate
  endDate: ISODate | null
  active: boolean
  lastGeneratedMonth: MonthKey | null
  createdAt: string
}

export interface Contract {
  id: string
  clientId: string
  description: string
  serviceType: ServiceType
  monthlyCents: number
  billingDay: number
  startDate: ISODate
  endDate: ISODate | null
  status: ContractStatus
  lastGeneratedMonth: MonthKey | null
  notes: string
  createdAt: string
}

export interface Proposal {
  id: string
  title: string
  clientId: string | null
  leadName: string
  leadEmail: string
  leadPhone: string
  serviceType: ServiceType
  valueCents: number
  stage: ProposalStage
  /** Etapa mais avançada já alcançada — alimenta o funil. */
  furthestStage: FunnelStage
  createdDate: ISODate
  expectedCloseDate: ISODate | null
  closedDate: ISODate | null
  lostReason: string
  notes: string
  saleId: string | null
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: 'app'
  companyName: string
  document: string
  email: string
  phone: string
  monthlyGoalCents: number
  theme: ThemePreference
  updatedAt: string
}

export interface Dataset {
  clients: Client[]
  sales: Sale[]
  receivables: Receivable[]
  expenses: Expense[]
  recurringExpenses: RecurringExpense[]
  contracts: Contract[]
  proposals: Proposal[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  companyName: '',
  document: '',
  email: '',
  phone: '',
  monthlyGoalCents: 0,
  theme: 'system',
  updatedAt: '',
}
