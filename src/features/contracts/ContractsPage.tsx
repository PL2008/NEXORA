import { FileSignature, Pause, Play, Plus, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { repo } from '@/db/repo'
import { SERVICE_TYPE_LABEL } from '@/domain/labels'
import { mrr } from '@/domain/metrics'
import { nextContractDueDate } from '@/domain/recurring'
import type { Contract } from '@/domain/types'
import { useDialog } from '@/hooks/useDialog'
import { formatDate } from '@/lib/dates'
import { formatBRL, formatInteger } from '@/lib/money'
import { ContractStatusBadge, MiniStat } from '../shared'
import { useAction, useClientName } from '../hooks'
import { ContractForm } from './ContractForm'

const ORDER = { active: 0, paused: 1, ended: 2 } as const

export function ContractsPage() {
  const { ds, today } = useData()
  const clientName = useClientName()
  const run = useAction()
  const confirm = useConfirm()
  const form = useDialog<Contract>()
  const m = mrr(ds, today)
  const contracts = useMemo(
    () => [...ds.contracts].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.monthlyCents - a.monthlyCents),
    [ds.contracts],
  )
  const charged = ds.receivables.filter((r) => r.contractId)
  const receivedFromContracts = charged.filter((r) => r.paidDate).reduce((a, r) => a + r.amountCents, 0)

  const newButton = (
    <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => form.show(null)}>
      Novo contrato
    </Button>
  )

  const end = async (c: Contract) => {
    const ok = await confirm({
      title: 'Encerrar contrato?',
      description: `Não serão geradas novas cobranças para “${c.description}”. Cobranças em aberto com vencimento após hoje serão removidas.`,
      confirmLabel: 'Encerrar',
      tone: 'danger',
    })
    if (ok) await run(() => repo.setContractStatus(c.id, 'ended'), 'Contrato encerrado')
  }

  return (
    <>
      <PageHeader
        title="Contratos recorrentes"
        description="Manutenção, hospedagem e SaaS com cobrança mensal automática"
        actions={newButton}
      />
      {contracts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<FileSignature />}
            title="Nenhum contrato recorrente"
            description="Cadastre contratos mensais: as cobranças são geradas sozinhas todo mês e somam no MRR."
            action={newButton}
          />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="MRR" value={formatBRL(m.cents)} hint="Receita recorrente mensal" />
            <MiniStat label="ARR" value={formatBRL(m.cents * 12)} hint="MRR × 12" />
            <MiniStat label="Contratos ativos" value={formatInteger(m.activeCount)} hint={`de ${contracts.length}`} />
            <MiniStat
              label="Recebido de contratos"
              value={formatBRL(receivedFromContracts)}
              hint={`${charged.length} cobranças geradas`}
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <ul className="divide-y divide-line" aria-label="Contratos">
              <AnimatePresence initial={false}>
                {contracts.map((c) => {
                  const next = nextContractDueDate(c, today)
                  return (
                    <motion.li
                      key={c.id}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
                    >
                      <button
                        type="button"
                        onClick={() => form.show(c)}
                        className="min-w-0 flex-1 text-left"
                        aria-label={`Editar contrato ${c.description}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-ink">{c.description}</span>
                          <ContractStatusBadge status={c.status} />
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
                          {clientName(c.clientId)} · {SERVICE_TYPE_LABEL[c.serviceType]} · vence todo dia {c.billingDay}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                          Desde {formatDate(c.startDate)}
                          {c.endDate ? ` · até ${formatDate(c.endDate)}` : ''}
                          {next ? ` · próxima cobrança ${formatDate(next)}` : ''}
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="tnum text-[15px] font-semibold text-ink">
                          {formatBRL(c.monthlyCents)}
                          <span className="text-[12px] font-normal text-ink-3">/mês</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {c.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Pause className="size-3.5" />}
                              onClick={() => void run(() => repo.setContractStatus(c.id, 'paused'), 'Contrato pausado')}
                            >
                              Pausar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Play className="size-3.5" />}
                              onClick={() => void run(() => repo.setContractStatus(c.id, 'active'), 'Contrato reativado')}
                            >
                              Reativar
                            </Button>
                          )}
                          {c.status !== 'ended' ? (
                            <Button size="sm" variant="ghost" icon={<Square className="size-3" />} onClick={() => void end(c)}>
                              Encerrar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </div>
        </>
      )}
      <ContractForm open={form.open} contract={form.item} onClose={form.close} />
    </>
  )
}
