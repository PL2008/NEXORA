import { z } from 'zod'
import { isValidISODate, isValidMonthKey } from '@/lib/dates'
import {
  CONTRACT_STATUSES,
  EXPENSE_CATEGORIES,
  FUNNEL_STAGES,
  PAYMENT_MODES,
  PROJECT_STATUSES,
  PROPOSAL_STAGES,
  SERVICE_TYPES,
  THEMES,
} from './types'

// ————————————————————————————————————————————— primitivos

export const isoDate = z.string().refine(isValidISODate, { message: 'Data inválida' })
export const monthKeySchema = z.string().refine(isValidMonthKey, { message: 'Mês inválido' })
const MAX_CENTS = 100_000_000_00 // R$ 100 milhões
export const cents = z
  .number({ message: 'Informe um valor' })
  .int('Valor inválido')
  .min(0, 'O valor não pode ser negativo')
  .max(MAX_CENTS, 'Valor muito alto')
export const positiveCents = cents.refine((v) => v > 0, { message: 'Informe um valor maior que zero' })
const text = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres`)
const requiredText = (max: number, message: string) => text(max).min(1, message)
const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'E-mail inválido' })

// ————————————————————————————————————————————— entidades (backup)

export const clientSchema = z.object({
  id: z.string().min(1),
  name: requiredText(120, 'Informe o nome'),
  company: text(120),
  email: optionalEmail,
  phone: text(40),
  document: text(40),
  notes: text(2000),
  createdAt: z.string(),
})

export const projectCostSchema = z.object({
  id: z.string().min(1),
  description: requiredText(120, 'Descreva o custo'),
  amountCents: positiveCents,
})

export const saleSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  title: requiredText(140, 'Informe o nome do projeto'),
  serviceType: z.enum(SERVICE_TYPES),
  totalCents: positiveCents,
  date: isoDate,
  status: z.enum(PROJECT_STATUSES),
  deadline: isoDate.nullable(),
  paymentMode: z.enum(PAYMENT_MODES),
  costs: z.array(projectCostSchema),
  notes: text(2000),
  proposalId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const receivableSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  saleId: z.string().nullable(),
  contractId: z.string().nullable(),
  periodKey: monthKeySchema.nullable(),
  number: z.number().int().min(1),
  count: z.number().int().min(1),
  amountCents: positiveCents,
  dueDate: isoDate,
  paidDate: isoDate.nullable(),
  createdAt: z.string(),
})

export const expenseSchema = z.object({
  id: z.string().min(1),
  description: requiredText(140, 'Descreva a despesa'),
  category: z.enum(EXPENSE_CATEGORIES),
  amountCents: positiveCents,
  date: isoDate,
  recurringId: z.string().nullable(),
  notes: text(2000),
  createdAt: z.string(),
})

export const recurringExpenseSchema = z.object({
  id: z.string().min(1),
  description: requiredText(140, 'Descreva a despesa'),
  category: z.enum(EXPENSE_CATEGORIES),
  amountCents: positiveCents,
  startDate: isoDate,
  endDate: isoDate.nullable(),
  active: z.boolean(),
  lastGeneratedMonth: monthKeySchema.nullable(),
  createdAt: z.string(),
})

export const contractSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  description: requiredText(140, 'Descreva o contrato'),
  serviceType: z.enum(SERVICE_TYPES),
  monthlyCents: positiveCents,
  billingDay: z.number().int().min(1).max(31),
  startDate: isoDate,
  endDate: isoDate.nullable(),
  status: z.enum(CONTRACT_STATUSES),
  lastGeneratedMonth: monthKeySchema.nullable(),
  notes: text(2000),
  createdAt: z.string(),
})

export const proposalSchema = z.object({
  id: z.string().min(1),
  title: requiredText(140, 'Informe o título'),
  clientId: z.string().nullable(),
  leadName: text(120),
  leadEmail: optionalEmail,
  leadPhone: text(40),
  serviceType: z.enum(SERVICE_TYPES),
  valueCents: cents,
  stage: z.enum(PROPOSAL_STAGES),
  furthestStage: z.enum(FUNNEL_STAGES),
  createdDate: isoDate,
  expectedCloseDate: isoDate.nullable(),
  closedDate: isoDate.nullable(),
  lostReason: text(500),
  notes: text(2000),
  saleId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const settingsSchema = z.object({
  id: z.literal('app'),
  companyName: text(120),
  document: text(40),
  email: optionalEmail,
  phone: text(40),
  monthlyGoalCents: cents,
  theme: z.enum(THEMES),
  updatedAt: z.string(),
})

// ————————————————————————————————————————————— formulários

export const clientFormSchema = clientSchema.pick({
  name: true,
  company: true,
  email: true,
  phone: true,
  document: true,
  notes: true,
})
export type ClientFormValues = z.infer<typeof clientFormSchema>

export const expenseFormSchema = z.object({
  description: requiredText(140, 'Descreva a despesa'),
  category: z.enum(EXPENSE_CATEGORIES),
  amountCents: positiveCents,
  date: isoDate,
  notes: text(2000),
  repeatMonthly: z.boolean(),
})
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export const contractFormSchema = z
  .object({
    clientId: z.string().min(1, 'Selecione o cliente'),
    description: requiredText(140, 'Descreva o contrato'),
    serviceType: z.enum(SERVICE_TYPES),
    monthlyCents: positiveCents,
    billingDay: z.number().int().min(1, 'Dia entre 1 e 31').max(31, 'Dia entre 1 e 31'),
    startDate: isoDate,
    endDate: isoDate.nullable(),
    notes: text(2000),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'O término deve ser depois do início',
    path: ['endDate'],
  })
export type ContractFormValues = z.infer<typeof contractFormSchema>

export const proposalFormSchema = z
  .object({
    title: requiredText(140, 'Informe o título'),
    clientId: z.string().nullable(),
    leadName: text(120),
    leadEmail: optionalEmail,
    leadPhone: text(40),
    serviceType: z.enum(SERVICE_TYPES),
    valueCents: cents,
    createdDate: isoDate,
    expectedCloseDate: isoDate.nullable(),
    notes: text(2000),
  })
  .refine((v) => v.clientId !== null || v.leadName.length > 0, {
    message: 'Selecione um cliente ou informe o nome do lead',
    path: ['leadName'],
  })
export type ProposalFormValues = z.infer<typeof proposalFormSchema>

export const settingsFormSchema = settingsSchema.pick({
  companyName: true,
  document: true,
  email: true,
  phone: true,
  monthlyGoalCents: true,
})
export type SettingsFormValues = z.infer<typeof settingsFormSchema>

export const installmentFormSchema = z.object({
  id: z.string().optional(),
  amountCents: positiveCents,
  dueDate: isoDate,
  paidDate: isoDate.nullable(),
})

export const saleFormSchema = z
  .object({
    clientId: z.string().nullable(),
    newClientName: text(120),
    newClientEmail: optionalEmail,
    newClientPhone: text(40),
    title: requiredText(140, 'Informe o nome do projeto'),
    serviceType: z.enum(SERVICE_TYPES),
    totalCents: positiveCents,
    date: isoDate,
    status: z.enum(PROJECT_STATUSES),
    deadline: isoDate.nullable(),
    paymentMode: z.enum(PAYMENT_MODES),
    installments: z.array(installmentFormSchema).min(1, 'Adicione ao menos uma parcela').max(120),
    costs: z.array(projectCostSchema).max(100),
    notes: text(2000),
  })
  .superRefine((v, ctx) => {
    if (v.clientId === null && v.newClientName.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Selecione ou cadastre o cliente', path: ['clientId'] })
    }
    const sum = v.installments.reduce((acc, i) => acc + i.amountCents, 0)
    if (sum !== v.totalCents) {
      ctx.addIssue({ code: 'custom', message: 'A soma das parcelas deve ser igual ao valor total', path: ['installments'] })
    }
    if (v.deadline && v.deadline < v.date) {
      ctx.addIssue({ code: 'custom', message: 'O prazo deve ser depois da data da venda', path: ['deadline'] })
    }
  })
export type SaleFormValues = z.infer<typeof saleFormSchema>

/** Converte os erros do zod em { campo: mensagem } (primeira mensagem por campo). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
