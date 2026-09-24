import { addMonthsToKey, monthKey, todayISO, type ISODate } from '@/lib/dates'
import { createId, nowTimestamp } from '@/lib/id'
import { funnelIndex } from '@/domain/metrics'
import { pendingContractCharges, pendingRecurringExpenses } from '@/domain/recurring'
import type {
  ClientFormValues,
  ContractFormValues,
  ExpenseFormValues,
  ProposalFormValues,
  SaleFormValues,
  SettingsFormValues,
} from '@/domain/schemas'
import {
  DEFAULT_SETTINGS,
  type Client,
  type Contract,
  type ContractStatus,
  type Dataset,
  type Expense,
  type FunnelStage,
  type ProjectStatus,
  type Proposal,
  type ProposalStage,
  type Receivable,
  type RecurringExpense,
  type Sale,
  type Settings,
  type ThemePreference,
} from '@/domain/types'
import { db as defaultDb, type NexoraDB } from './db'

/** Erro de regra de negócio, com mensagem pronta para o usuário. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export async function loadDataset(database: NexoraDB = defaultDb): Promise<Dataset> {
  return database.transaction('r', database.allTables, async () => {
    const [clients, sales, receivables, expenses, recurringExpenses, contracts, proposals, settings] = await Promise.all([
      database.clients.toArray(),
      database.sales.toArray(),
      database.receivables.toArray(),
      database.expenses.toArray(),
      database.recurringExpenses.toArray(),
      database.contracts.toArray(),
      database.proposals.toArray(),
      database.settings.get('app'),
    ])
    return {
      clients,
      sales,
      receivables,
      expenses,
      recurringExpenses,
      contracts,
      proposals,
      settings: settings ?? DEFAULT_SETTINGS,
    }
  })
}

const maxMonth = (a: string | null, b: string) => (a && a > b ? a : b)

export function createRepo(database: NexoraDB = defaultDb) {
  const d = database

  // ——————————————————————————————————————————— clientes

  async function createClient(values: ClientFormValues): Promise<string> {
    const client: Client = { id: createId(), ...values, createdAt: nowTimestamp() }
    await d.clients.add(client)
    return client.id
  }

  async function updateClient(id: string, values: ClientFormValues): Promise<void> {
    const n = await d.clients.update(id, values)
    if (n === 0 && !(await d.clients.get(id))) throw new DomainError('Cliente não encontrado')
  }

  async function deleteClient(id: string): Promise<void> {
    await d.transaction('rw', [d.clients, d.sales, d.contracts, d.receivables, d.proposals], async () => {
      const [sales, contracts, receivables, proposals] = await Promise.all([
        d.sales.where('clientId').equals(id).count(),
        d.contracts.where('clientId').equals(id).count(),
        d.receivables.where('clientId').equals(id).count(),
        d.proposals.where('clientId').equals(id).count(),
      ])
      if (sales + contracts + receivables > 0) {
        throw new DomainError('Este cliente tem vendas, contratos ou recebimentos. Exclua-os antes de remover o cliente.')
      }
      if (proposals > 0) {
        const client = await d.clients.get(id)
        await d.proposals
          .where('clientId')
          .equals(id)
          .modify((p) => {
            p.clientId = null
            p.leadName = p.leadName || client?.name || ''
          })
      }
      await d.clients.delete(id)
    })
  }

  // ——————————————————————————————————————————— vendas

  async function saveSale(input: { id?: string; values: SaleFormValues; proposalId?: string | null }): Promise<string> {
    const { values } = input
    return d.transaction('rw', [d.clients, d.sales, d.receivables, d.proposals], async () => {
      const now = nowTimestamp()
      let clientId = values.clientId
      if (!clientId) {
        clientId = createId()
        await d.clients.add({
          id: clientId,
          name: values.newClientName,
          company: '',
          email: values.newClientEmail,
          phone: values.newClientPhone,
          document: '',
          notes: '',
          createdAt: now,
        })
      } else if (!(await d.clients.get(clientId))) {
        throw new DomainError('Cliente não encontrado')
      }

      const existing = input.id ? await d.sales.get(input.id) : undefined
      if (input.id && !existing) throw new DomainError('Venda não encontrada')
      const saleId = existing?.id ?? createId()
      const proposalId = input.proposalId ?? existing?.proposalId ?? null
      const sale: Sale = {
        id: saleId,
        clientId,
        title: values.title,
        serviceType: values.serviceType,
        totalCents: values.totalCents,
        date: values.date,
        status: values.status,
        deadline: values.deadline,
        paymentMode: values.paymentMode,
        costs: values.costs,
        notes: values.notes,
        proposalId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await d.sales.put(sale)

      // Parcelas: atualiza as existentes, cria as novas e remove as que saíram do plano.
      const current = await d.receivables.where('saleId').equals(saleId).toArray()
      const keep = new Set(values.installments.map((i) => i.id).filter(Boolean))
      const toDelete = current.filter((r) => !keep.has(r.id)).map((r) => r.id)
      if (toDelete.length) await d.receivables.bulkDelete(toDelete)
      const ordered = values.installments
        .map((i, order) => ({ ...i, order }))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order)
      const byId = new Map(current.map((r) => [r.id, r]))
      const rows: Receivable[] = ordered.map((i, idx) => {
        const prev = i.id ? byId.get(i.id) : undefined
        return {
          id: prev?.id ?? createId(),
          clientId: clientId!,
          saleId,
          contractId: null,
          periodKey: null,
          number: idx + 1,
          count: ordered.length,
          amountCents: i.amountCents,
          dueDate: i.dueDate,
          paidDate: i.paidDate,
          createdAt: prev?.createdAt ?? now,
        }
      })
      await d.receivables.bulkPut(rows)

      if (input.proposalId) {
        const proposal = await d.proposals.get(input.proposalId)
        if (proposal) {
          await d.proposals.update(proposal.id, {
            stage: 'won',
            furthestStage: 'won',
            clientId,
            saleId,
            closedDate: values.date,
            lostReason: '',
            updatedAt: now,
          })
        }
      }
      return saleId
    })
  }

  async function setSaleStatus(id: string, status: ProjectStatus): Promise<void> {
    await d.sales.update(id, { status, updatedAt: nowTimestamp() })
  }

  async function deleteSale(id: string): Promise<void> {
    await d.transaction('rw', [d.sales, d.receivables, d.proposals], async () => {
      await d.receivables.where('saleId').equals(id).delete()
      await d.proposals
        .where('saleId')
        .equals(id)
        .modify((p) => {
          p.saleId = null
          p.stage = 'negotiation'
          p.furthestStage = 'negotiation'
          p.closedDate = null
          p.updatedAt = nowTimestamp()
        })
      await d.sales.delete(id)
    })
  }

  // ——————————————————————————————————————————— recebimentos

  async function markReceivablePaid(id: string, paidDate: ISODate): Promise<void> {
    const n = await d.receivables.update(id, { paidDate })
    if (n === 0 && !(await d.receivables.get(id))) throw new DomainError('Recebimento não encontrado')
  }

  async function markReceivableUnpaid(id: string): Promise<void> {
    await d.receivables.update(id, { paidDate: null })
  }

  // ——————————————————————————————————————————— despesas

  async function saveExpense(input: { id?: string; values: ExpenseFormValues }, today: ISODate = todayISO()): Promise<string> {
    const { values } = input
    return d.transaction('rw', [d.expenses, d.recurringExpenses], async () => {
      if (input.id) {
        const existing = await d.expenses.get(input.id)
        if (!existing) throw new DomainError('Despesa não encontrada')
        await d.expenses.update(input.id, {
          description: values.description,
          category: values.category,
          amountCents: values.amountCents,
          date: values.date,
          notes: values.notes,
        })
        return input.id
      }
      if (values.repeatMonthly) {
        const rule: RecurringExpense = {
          id: createId(),
          description: values.description,
          category: values.category,
          amountCents: values.amountCents,
          startDate: values.date,
          endDate: null,
          active: true,
          lastGeneratedMonth: null,
          createdAt: nowTimestamp(),
        }
        const gen = pendingRecurringExpenses(rule, today)
        const generated = gen.expenses.map((e) => (e.date === values.date ? { ...e, notes: values.notes } : e))
        await d.recurringExpenses.add({ ...rule, lastGeneratedMonth: gen.lastGeneratedMonth })
        if (generated.length) await d.expenses.bulkAdd(generated)
        return generated[0]?.id ?? rule.id
      }
      const expense: Expense = {
        id: createId(),
        description: values.description,
        category: values.category,
        amountCents: values.amountCents,
        date: values.date,
        recurringId: null,
        notes: values.notes,
        createdAt: nowTimestamp(),
      }
      await d.expenses.add(expense)
      return expense.id
    })
  }

  async function deleteExpense(id: string): Promise<void> {
    await d.expenses.delete(id)
  }

  async function updateRecurringExpense(
    id: string,
    values: Pick<RecurringExpense, 'description' | 'category' | 'amountCents'>,
  ): Promise<void> {
    await d.recurringExpenses.update(id, values)
  }

  async function setRecurringExpenseActive(id: string, active: boolean, today: ISODate = todayISO()): Promise<void> {
    await d.transaction('rw', [d.recurringExpenses, d.expenses], async () => {
      const rule = await d.recurringExpenses.get(id)
      if (!rule) throw new DomainError('Despesa recorrente não encontrada')
      if (!active) {
        await d.recurringExpenses.update(id, { active: false, endDate: today })
        return
      }
      // Ao reativar, não gera retroativamente os meses em que ficou parada.
      const updated: RecurringExpense = {
        ...rule,
        active: true,
        endDate: null,
        lastGeneratedMonth: maxMonth(rule.lastGeneratedMonth, addMonthsToKey(monthKey(today), -1)),
      }
      const gen = pendingRecurringExpenses(updated, today)
      await d.recurringExpenses.put({ ...updated, lastGeneratedMonth: gen.lastGeneratedMonth })
      if (gen.expenses.length) await d.expenses.bulkAdd(gen.expenses)
    })
  }

  async function deleteRecurringExpense(id: string): Promise<void> {
    await d.transaction('rw', [d.recurringExpenses, d.expenses], async () => {
      await d.expenses
        .where('recurringId')
        .equals(id)
        .modify((e) => {
          e.recurringId = null
        })
      await d.recurringExpenses.delete(id)
    })
  }

  // ——————————————————————————————————————————— contratos

  async function saveContract(
    input: { id?: string; values: ContractFormValues; markPastAsPaid?: boolean },
    today: ISODate = todayISO(),
  ): Promise<string> {
    const { values } = input
    return d.transaction('rw', [d.contracts, d.receivables, d.clients], async () => {
      if (!(await d.clients.get(values.clientId))) throw new DomainError('Cliente não encontrado')
      if (!input.id) {
        const contract: Contract = {
          id: createId(),
          ...values,
          status: 'active',
          lastGeneratedMonth: null,
          createdAt: nowTimestamp(),
        }
        const gen = pendingContractCharges(contract, today, input.markPastAsPaid ? { paidBefore: today } : {})
        await d.contracts.add({ ...contract, lastGeneratedMonth: gen.lastGeneratedMonth })
        if (gen.charges.length) await d.receivables.bulkAdd(gen.charges)
        return contract.id
      }
      const existing = await d.contracts.get(input.id)
      if (!existing) throw new DomainError('Contrato não encontrado')
      const updated: Contract = { ...existing, ...values }
      const charges = await d.receivables.where('contractId').equals(existing.id).toArray()
      for (const r of charges) {
        if (r.paidDate) continue
        if (updated.endDate && r.dueDate > updated.endDate) {
          await d.receivables.delete(r.id)
          continue
        }
        const patch: Partial<Receivable> = {}
        if (r.clientId !== updated.clientId) patch.clientId = updated.clientId
        if (r.dueDate >= today && r.amountCents !== updated.monthlyCents) patch.amountCents = updated.monthlyCents
        if (Object.keys(patch).length) await d.receivables.update(r.id, patch)
      }
      const gen = pendingContractCharges(updated, today)
      await d.contracts.put({ ...updated, lastGeneratedMonth: gen.lastGeneratedMonth })
      if (gen.charges.length) await d.receivables.bulkAdd(gen.charges)
      return updated.id
    })
  }

  async function setContractStatus(id: string, status: ContractStatus, today: ISODate = todayISO()): Promise<void> {
    await d.transaction('rw', [d.contracts, d.receivables], async () => {
      const contract = await d.contracts.get(id)
      if (!contract) throw new DomainError('Contrato não encontrado')
      if (status === 'paused') {
        await d.contracts.update(id, { status })
        return
      }
      if (status === 'ended') {
        const endDate = contract.endDate && contract.endDate < today ? contract.endDate : today
        await d.contracts.update(id, { status, endDate })
        const future = await d.receivables.where('contractId').equals(id).toArray()
        const remove = future.filter((r) => !r.paidDate && r.dueDate > endDate).map((r) => r.id)
        if (remove.length) await d.receivables.bulkDelete(remove)
        return
      }
      // Reativar: sem cobranças retroativas do período pausado/encerrado.
      const reopened: Contract = {
        ...contract,
        status: 'active',
        endDate: contract.status === 'ended' ? null : contract.endDate,
        lastGeneratedMonth: maxMonth(contract.lastGeneratedMonth, addMonthsToKey(monthKey(today), -1)),
      }
      const gen = pendingContractCharges(reopened, today)
      await d.contracts.put({ ...reopened, lastGeneratedMonth: gen.lastGeneratedMonth })
      if (gen.charges.length) await d.receivables.bulkAdd(gen.charges)
    })
  }

  async function deleteContract(id: string): Promise<void> {
    await d.transaction('rw', [d.contracts, d.receivables], async () => {
      await d.receivables.where('contractId').equals(id).delete()
      await d.contracts.delete(id)
    })
  }

  // ——————————————————————————————————————————— propostas

  async function saveProposal(input: { id?: string; values: ProposalFormValues; stage?: ProposalStage }): Promise<string> {
    const { values } = input
    const now = nowTimestamp()
    if (values.clientId && !(await d.clients.get(values.clientId))) throw new DomainError('Cliente não encontrado')
    if (input.id) {
      const existing = await d.proposals.get(input.id)
      if (!existing) throw new DomainError('Proposta não encontrada')
      await d.proposals.put({ ...existing, ...values, updatedAt: now })
      if (input.stage && input.stage !== existing.stage) await moveProposal(existing.id, input.stage)
      return existing.id
    }
    const stage = input.stage && input.stage !== 'won' ? input.stage : 'lead'
    const proposal: Proposal = {
      id: createId(),
      ...values,
      stage,
      furthestStage: stage === 'lost' ? 'lead' : stage,
      closedDate: stage === 'lost' ? todayISO() : null,
      lostReason: '',
      saleId: null,
      createdAt: now,
      updatedAt: now,
    }
    await d.proposals.add(proposal)
    return proposal.id
  }

  async function moveProposal(
    id: string,
    stage: ProposalStage,
    options: { lostReason?: string; today?: ISODate } = {},
  ): Promise<void> {
    if (stage === 'won') throw new DomainError('Para marcar como ganha, converta a proposta em venda.')
    const today = options.today ?? todayISO()
    await d.transaction('rw', [d.proposals], async () => {
      const p = await d.proposals.get(id)
      if (!p) throw new DomainError('Proposta não encontrada')
      if (p.stage === 'won' && p.saleId) throw new DomainError('Esta proposta já virou venda. Exclua a venda para reabri-la.')
      const patch: Partial<Proposal> = { stage, updatedAt: nowTimestamp() }
      if (stage === 'lost') {
        patch.closedDate = today
        patch.lostReason = options.lostReason?.trim() ?? ''
      } else {
        patch.closedDate = null
        patch.lostReason = ''
        const target = stage as FunnelStage
        if (funnelIndex(target) > funnelIndex(p.furthestStage)) patch.furthestStage = target
      }
      await d.proposals.update(id, patch)
    })
  }

  async function deleteProposal(id: string): Promise<void> {
    await d.transaction('rw', [d.proposals, d.sales], async () => {
      await d.sales
        .where('proposalId')
        .equals(id)
        .modify((s) => {
          s.proposalId = null
        })
      await d.proposals.delete(id)
    })
  }

  // ——————————————————————————————————————————— configurações

  async function getSettings(): Promise<Settings> {
    return (await d.settings.get('app')) ?? DEFAULT_SETTINGS
  }

  async function saveSettings(values: SettingsFormValues): Promise<void> {
    const current = await getSettings()
    await d.settings.put({ ...current, ...values, id: 'app', updatedAt: nowTimestamp() })
  }

  async function setTheme(theme: ThemePreference): Promise<void> {
    const current = await getSettings()
    await d.settings.put({ ...current, theme, updatedAt: nowTimestamp() })
  }

  async function clearAll(): Promise<void> {
    await d.transaction('rw', d.allTables, async () => {
      await Promise.all(d.allTables.map((t) => t.clear()))
    })
  }

  return {
    createClient,
    updateClient,
    deleteClient,
    saveSale,
    setSaleStatus,
    deleteSale,
    markReceivablePaid,
    markReceivableUnpaid,
    saveExpense,
    deleteExpense,
    updateRecurringExpense,
    setRecurringExpenseActive,
    deleteRecurringExpense,
    saveContract,
    setContractStatus,
    deleteContract,
    saveProposal,
    moveProposal,
    deleteProposal,
    getSettings,
    saveSettings,
    setTheme,
    clearAll,
  }
}

export type Repo = ReturnType<typeof createRepo>
export const repo = createRepo()
