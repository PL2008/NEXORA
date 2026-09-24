import type {
  ContractStatus,
  ExpenseCategory,
  PaymentMode,
  ProjectStatus,
  ProposalStage,
  ServiceType,
  ThemePreference,
} from './types'

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  institutional_site: 'Site institucional',
  landing_page: 'Landing page',
  ecommerce: 'E-commerce',
  mobile_app: 'App',
  web_system: 'Sistema web',
  saas: 'SaaS',
  maintenance: 'Manutenção',
  hosting: 'Hospedagem',
  design: 'Design',
  consulting: 'Consultoria',
  other: 'Outro',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  in_review: 'Em revisão',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  single: 'À vista',
  installments: 'Parcelado',
  custom: 'Personalizado',
}

export const PROPOSAL_STAGE_LABEL: Record<ProposalStage, string> = {
  lead: 'Lead',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganha',
  lost: 'Perdida',
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  ended: 'Encerrado',
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  software: 'Ferramentas e software',
  hosting: 'Servidores e domínios',
  marketing: 'Marketing',
  taxes: 'Impostos',
  payroll: 'Pessoal e pró-labore',
  freelancers: 'Freelancers',
  equipment: 'Equipamentos',
  office: 'Escritório',
  fees: 'Taxas e tarifas',
  education: 'Cursos e educação',
  other: 'Outros',
}

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
}
