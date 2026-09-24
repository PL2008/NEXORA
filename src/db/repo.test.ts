import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SaleFormValues } from '@/domain/schemas'
import { createBackup, parseBackup, restoreBackup } from './backup'
import { NexoraDB } from './db'
import { createRepo, DomainError, loadDataset } from './repo'
import { syncRecurring } from './sync'

let database: NexoraDB
let repo: ReturnType<typeof createRepo>
let n = 0

beforeEach(async () => {
  database = new NexoraDB(`test-${++n}`)
  await database.open()
  repo = createRepo(database)
})

afterEach(async () => {
  await database.delete()
})

function saleValues(p: Partial<SaleFormValues> = {}): SaleFormValues {
  return {
    clientId: null,
    newClientName: 'Padaria Aurora',
    newClientEmail: 'contato@aurora.com',
    newClientPhone: '',
    title: 'Site institucional',
    serviceType: 'institutional_site',
    totalCents: 300000,
    date: '2026-09-01',
    status: 'in_progress',
    deadline: null,
    paymentMode: 'installments',
    installments: [
      { amountCents: 100000, dueDate: '2026-09-01', paidDate: '2026-09-01' },
      { amountCents: 100000, dueDate: '2026-10-01', paidDate: null },
      { amountCents: 100000, dueDate: '2026-11-01', paidDate: null },
    ],
    costs: [],
    notes: '',
    ...p,
  }
}

describe('banco vazio', () => {
  it('começa sem nenhum dado', async () => {
    const ds = await loadDataset(database)
    expect(ds.clients).toHaveLength(0)
    expect(ds.sales).toHaveLength(0)
    expect(ds.receivables).toHaveLength(0)
    expect(ds.settings.monthlyGoalCents).toBe(0)
  })
})

describe('vendas', () => {
  it('cria cliente novo, venda e parcelas numeradas', async () => {
    const id = await repo.saveSale({ values: saleValues() })
    const ds = await loadDataset(database)
    expect(ds.clients).toHaveLength(1)
    expect(ds.clients[0]!.name).toBe('Padaria Aurora')
    const parcels = ds.receivables.filter((r) => r.saleId === id).sort((a, b) => a.number - b.number)
    expect(parcels.map((p) => [p.number, p.count, p.paidDate])).toEqual([
      [1, 3, '2026-09-01'],
      [2, 3, null],
      [3, 3, null],
    ])
  })

  it('ao editar mantém IDs das parcelas existentes e remove as excluídas', async () => {
    const id = await repo.saveSale({ values: saleValues() })
    const before = (await loadDataset(database)).receivables.sort((a, b) => a.number - b.number)
    const clientId = before[0]!.clientId
    await repo.saveSale({
      id,
      values: saleValues({
        clientId,
        paymentMode: 'custom',
        installments: [
          { id: before[0]!.id, amountCents: 100000, dueDate: '2026-09-01', paidDate: '2026-09-01' },
          { id: before[1]!.id, amountCents: 200000, dueDate: '2026-10-01', paidDate: null },
        ],
      }),
    })
    const after = (await loadDataset(database)).receivables.sort((a, b) => a.number - b.number)
    expect(after.map((r) => [r.id, r.amountCents, r.count])).toEqual([
      [before[0]!.id, 100000, 2],
      [before[1]!.id, 200000, 2],
    ])
    expect((await loadDataset(database)).clients).toHaveLength(1)
  })

  it('excluir venda remove as parcelas e reabre a proposta', async () => {
    const proposalId = await repo.saveProposal({
      values: {
        title: 'Loja',
        clientId: null,
        leadName: 'Loja X',
        leadEmail: '',
        leadPhone: '',
        serviceType: 'ecommerce',
        valueCents: 300000,
        createdDate: '2026-08-01',
        expectedCloseDate: null,
        notes: '',
      },
      stage: 'negotiation',
    })
    const saleId = await repo.saveSale({ values: saleValues(), proposalId })
    let p = (await loadDataset(database)).proposals[0]!
    expect(p).toMatchObject({ stage: 'won', furthestStage: 'won', saleId })
    expect(p.clientId).not.toBeNull()
    await repo.deleteSale(saleId)
    const ds = await loadDataset(database)
    expect(ds.receivables).toHaveLength(0)
    p = ds.proposals[0]!
    expect(p).toMatchObject({ stage: 'negotiation', saleId: null })
  })

  it('não exclui cliente com vendas', async () => {
    await repo.saveSale({ values: saleValues() })
    const clientId = (await loadDataset(database)).clients[0]!.id
    await expect(repo.deleteClient(clientId)).rejects.toBeInstanceOf(DomainError)
  })
})

describe('recebimentos', () => {
  it('marca e desmarca pagamento', async () => {
    await repo.saveSale({ values: saleValues() })
    const r = (await loadDataset(database)).receivables.find((x) => x.number === 2)!
    await repo.markReceivablePaid(r.id, '2026-09-20')
    expect((await database.receivables.get(r.id))!.paidDate).toBe('2026-09-20')
    await repo.markReceivableUnpaid(r.id)
    expect((await database.receivables.get(r.id))!.paidDate).toBeNull()
  })
})

describe('contratos', () => {
  async function newContract(markPastAsPaid = false) {
    const clientId = await repo.createClient({ name: 'Cli', company: '', email: '', phone: '', document: '', notes: '' })
    const id = await repo.saveContract(
      {
        values: {
          clientId,
          description: 'Hospedagem',
          serviceType: 'hosting',
          monthlyCents: 15000,
          billingDay: 5,
          startDate: '2026-07-01',
          endDate: null,
          notes: '',
        },
        markPastAsPaid,
      },
      '2026-09-24',
    )
    return { id, clientId }
  }

  it('gera cobranças retroativas e marca as vencidas como pagas quando pedido', async () => {
    await newContract(true)
    const rs = (await loadDataset(database)).receivables.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    expect(rs.map((r) => [r.dueDate, r.paidDate])).toEqual([
      ['2026-07-05', '2026-07-05'],
      ['2026-08-05', '2026-08-05'],
      ['2026-09-05', '2026-09-05'],
    ])
  })

  it('sincronização é idempotente e gera o mês seguinte', async () => {
    await newContract()
    expect(await syncRecurring(database, '2026-09-24')).toEqual({ charges: 0, expenses: 0 })
    expect(await syncRecurring(database, '2026-10-02')).toEqual({ charges: 1, expenses: 0 })
    expect(await syncRecurring(database, '2026-10-30')).toEqual({ charges: 0, expenses: 0 })
    expect((await loadDataset(database)).receivables).toHaveLength(4)
  })

  it('pausar e retomar não gera meses retroativos; encerrar remove cobranças futuras', async () => {
    const { id } = await newContract()
    await repo.setContractStatus(id, 'paused', '2026-09-24')
    await syncRecurring(database, '2026-11-15')
    expect((await loadDataset(database)).receivables).toHaveLength(3)
    await repo.setContractStatus(id, 'active', '2026-11-15')
    let rs = (await loadDataset(database)).receivables.map((r) => r.periodKey).sort()
    expect(rs).toEqual(['2026-07', '2026-08', '2026-09', '2026-11'])
    await repo.setContractStatus(id, 'ended', '2026-11-02')
    rs = (await loadDataset(database)).receivables.map((r) => r.periodKey).sort()
    expect(rs).toEqual(['2026-07', '2026-08', '2026-09'])
    expect((await database.contracts.get(id))!.endDate).toBe('2026-11-02')
  })
})

describe('despesas recorrentes', () => {
  it('cria regra, gera meses e para ao desativar', async () => {
    await repo.saveExpense(
      {
        values: {
          description: 'Aluguel',
          category: 'office',
          amountCents: 150000,
          date: '2026-08-10',
          notes: '',
          repeatMonthly: true,
        },
      },
      '2026-09-24',
    )
    let ds = await loadDataset(database)
    expect(ds.recurringExpenses).toHaveLength(1)
    expect(ds.expenses.map((e) => e.date).sort()).toEqual(['2026-08-10', '2026-09-10'])
    const ruleId = ds.recurringExpenses[0]!.id
    await repo.setRecurringExpenseActive(ruleId, false, '2026-09-24')
    await syncRecurring(database, '2026-12-01')
    expect((await loadDataset(database)).expenses).toHaveLength(2)
    await repo.deleteRecurringExpense(ruleId)
    ds = await loadDataset(database)
    expect(ds.recurringExpenses).toHaveLength(0)
    expect(ds.expenses.every((e) => e.recurringId === null)).toBe(true)
  })
})

describe('propostas', () => {
  it('registra a etapa mais avançada e exige conversão para ganhar', async () => {
    const id = await repo.saveProposal({
      values: {
        title: 'App',
        clientId: null,
        leadName: 'Startup',
        leadEmail: '',
        leadPhone: '',
        serviceType: 'mobile_app',
        valueCents: 900000,
        createdDate: '2026-09-01',
        expectedCloseDate: null,
        notes: '',
      },
    })
    await repo.moveProposal(id, 'negotiation')
    await repo.moveProposal(id, 'lost', { lostReason: 'Preço', today: '2026-09-20' })
    const p = (await database.proposals.get(id))!
    expect(p).toMatchObject({ stage: 'lost', furthestStage: 'negotiation', closedDate: '2026-09-20', lostReason: 'Preço' })
    await expect(repo.moveProposal(id, 'won')).rejects.toBeInstanceOf(DomainError)
  })
})

describe('backup', () => {
  it('exporta e restaura tudo', async () => {
    await repo.saveSale({ values: saleValues() })
    await repo.saveSettings({ companyName: 'NEXORA', document: '', email: '', phone: '', monthlyGoalCents: 2000000 })
    const backup = await createBackup(database)
    const json = JSON.stringify(backup)
    await repo.clearAll()
    expect((await loadDataset(database)).sales).toHaveLength(0)
    await restoreBackup(parseBackup(json), database)
    const ds = await loadDataset(database)
    expect(ds.sales).toHaveLength(1)
    expect(ds.receivables).toHaveLength(3)
    expect(ds.settings.companyName).toBe('NEXORA')
  })

  it('rejeita arquivos inválidos', async () => {
    expect(() => parseBackup('não é json')).toThrow(DomainError)
    expect(() => parseBackup(JSON.stringify({ app: 'outro' }))).toThrow(DomainError)
    const backup = await createBackup(database)
    backup.data.sales.push({
      id: 's1',
      clientId: 'inexistente',
      title: 'x',
      serviceType: 'other',
      totalCents: 100,
      date: '2026-01-01',
      status: 'delivered',
      deadline: null,
      paymentMode: 'single',
      costs: [],
      notes: '',
      proposalId: null,
      createdAt: '',
      updatedAt: '',
    })
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/cliente/)
  })
})
