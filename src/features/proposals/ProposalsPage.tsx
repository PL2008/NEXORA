import { ArrowRight, CalendarClock, CheckCircle2, Plus, RotateCcw, Target, XCircle } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { repo } from '@/db/repo'
import { PROPOSAL_STAGE_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { proposalFunnel } from '@/domain/metrics'
import { PROPOSAL_STAGES, type Proposal, type ProposalStage } from '@/domain/types'
import { useDialog } from '@/hooks/useDialog'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'
import { formatBRL, formatPercent } from '@/lib/money'
import { SaleForm } from '../sales/SaleForm'
import { MiniStat } from '../shared'
import { useAction, useClientName } from '../hooks'
import { ProposalForm } from './ProposalForm'

const NEXT: Partial<Record<ProposalStage, ProposalStage>> = { lead: 'proposal', proposal: 'negotiation' }
const DOT: Record<ProposalStage, string> = {
  lead: 'bg-ink-3',
  proposal: 'bg-accent',
  negotiation: 'bg-warn',
  won: 'bg-good',
  lost: 'bg-bad',
}

export function ProposalsPage() {
  const { ds, today } = useData()
  const clientName = useClientName()
  const run = useAction()
  const form = useDialog<Proposal>()
  const convert = useDialog<Proposal>()
  const lose = useDialog<Proposal>()

  const byStage = useMemo(() => {
    const map = Object.fromEntries(PROPOSAL_STAGES.map((s) => [s, [] as Proposal[]])) as Record<ProposalStage, Proposal[]>
    for (const p of [...ds.proposals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) map[p.stage].push(p)
    return map
  }, [ds.proposals])
  const funnel = useMemo(() => proposalFunnel(ds.proposals), [ds.proposals])
  const wonValue = byStage.won.reduce((a, p) => a + p.valueCents, 0)

  const name = (p: Proposal) => (p.clientId ? clientName(p.clientId) : p.leadName || 'Lead sem nome')

  const newButton = (
    <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => form.show(null)}>
      Nova proposta
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Propostas"
        description="Pipeline comercial: lead → proposta → negociação → ganha ou perdida"
        actions={newButton}
      />
      {ds.proposals.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<Target />}
            title="Pipeline vazio"
            description="Registre oportunidades desde o primeiro contato. Quando fechar, converta a proposta em venda com um clique."
            action={newButton}
          />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat
              label="Pipeline em aberto"
              value={formatBRL(funnel.openValueCents)}
              hint={`${funnel.openCount} ${funnel.openCount === 1 ? 'oportunidade' : 'oportunidades'}`}
            />
            <MiniStat
              label="Taxa de ganho"
              value={funnel.winRate === null ? '—' : formatPercent(funnel.winRate)}
              hint="Ganhas ÷ encerradas"
            />
            <MiniStat
              label="Ganhas"
              value={formatBRL(wonValue)}
              hint={`${byStage.won.length} ${byStage.won.length === 1 ? 'convertida' : 'convertidas'} em venda`}
            />
            <MiniStat label="Perdidas" value={String(funnel.lostCount)} hint={formatBRL(funnel.lostValueCents)} />
          </div>

          <LayoutGroup>
            <div className="-mx-4 flex snap-x snap-mandatory scrollbar-none gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
              {PROPOSAL_STAGES.map((stage) => {
                const items = byStage[stage]
                const total = items.reduce((a, p) => a + p.valueCents, 0)
                return (
                  <section
                    key={stage}
                    aria-label={PROPOSAL_STAGE_LABEL[stage]}
                    className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-surface-2/60 p-2 ring-1 ring-line ring-inset sm:w-[300px] lg:w-auto lg:max-w-none"
                  >
                    <header className="flex items-center justify-between px-2 pt-1.5 pb-2">
                      <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                        <span className={cn('size-2 rounded-full', DOT[stage])} aria-hidden />
                        {PROPOSAL_STAGE_LABEL[stage]}
                        <span className="tnum font-normal text-ink-3">{items.length}</span>
                      </h2>
                      <span className="tnum text-[12px] text-ink-3">{formatBRL(total, { hideCents: true })}</span>
                    </header>
                    <div className="flex min-h-[88px] flex-col gap-2">
                      <AnimatePresence initial={false}>
                        {items.map((p) => (
                          <motion.article
                            key={p.id}
                            layout
                            layoutId={p.id}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                            className="rounded-xl border border-line bg-surface p-3 shadow-card"
                            aria-label={p.title}
                          >
                            <button
                              type="button"
                              onClick={() => form.show(p)}
                              className="block w-full text-left"
                              aria-label={`Editar proposta ${p.title}`}
                            >
                              <p className="line-clamp-2 text-[13.5px] leading-snug font-medium text-ink">{p.title}</p>
                              <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{name(p)}</p>
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <span className="truncate text-[12px] text-ink-3">{SERVICE_TYPE_LABEL[p.serviceType]}</span>
                                <span className="tnum shrink-0 text-[13px] font-semibold text-ink">
                                  {p.valueCents > 0 ? formatBRL(p.valueCents, { hideCents: true }) : '—'}
                                </span>
                              </div>
                              {p.expectedCloseDate && (stage === 'lead' || stage === 'proposal' || stage === 'negotiation') ? (
                                <p
                                  className={cn(
                                    'mt-1.5 inline-flex items-center gap-1 text-[11.5px]',
                                    p.expectedCloseDate < today ? 'text-warn' : 'text-ink-3',
                                  )}
                                >
                                  <CalendarClock className="size-3" aria-hidden /> Fechamento {formatDate(p.expectedCloseDate)}
                                </p>
                              ) : null}
                              {stage === 'lost' && p.lostReason ? (
                                <p className="mt-1.5 line-clamp-2 text-[11.5px] text-ink-3">Motivo: {p.lostReason}</p>
                              ) : null}
                            </button>
                            <div className="mt-3 flex items-center gap-1 border-t border-line pt-2.5">
                              {stage === 'negotiation' ? (
                                <Button
                                  size="xs"
                                  variant="primary"
                                  icon={<CheckCircle2 className="size-3.5" />}
                                  onClick={() => convert.show(p)}
                                >
                                  Converter em venda
                                </Button>
                              ) : NEXT[stage] ? (
                                <Button
                                  size="xs"
                                  variant="soft"
                                  onClick={() =>
                                    void run(
                                      () => repo.moveProposal(p.id, NEXT[stage]!),
                                      `Movida para ${PROPOSAL_STAGE_LABEL[NEXT[stage]!]}`,
                                    )
                                  }
                                >
                                  {PROPOSAL_STAGE_LABEL[NEXT[stage]!]} <ArrowRight className="size-3.5" />
                                </Button>
                              ) : null}
                              {stage === 'lead' || stage === 'proposal' ? (
                                <IconAction label={`Converter ${p.title} em venda`} onClick={() => convert.show(p)}>
                                  <CheckCircle2 className="size-4" />
                                </IconAction>
                              ) : null}
                              {stage === 'lead' || stage === 'proposal' || stage === 'negotiation' ? (
                                <IconAction
                                  label={`Marcar ${p.title} como perdida`}
                                  onClick={() => lose.show(p)}
                                  className="ml-auto"
                                >
                                  <XCircle className="size-4" />
                                </IconAction>
                              ) : null}
                              {stage === 'lost' ? (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  icon={<RotateCcw className="size-3.5" />}
                                  onClick={() =>
                                    void run(
                                      () => repo.moveProposal(p.id, p.furthestStage === 'won' ? 'negotiation' : p.furthestStage),
                                      'Proposta reaberta',
                                    )
                                  }
                                >
                                  Reabrir
                                </Button>
                              ) : null}
                              {stage === 'won' && p.saleId ? (
                                <Link
                                  to={`/vendas?id=${p.saleId}`}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-accent-ink hover:bg-accent-soft"
                                >
                                  Ver venda <ArrowRight className="size-3.5" />
                                </Link>
                              ) : null}
                            </div>
                          </motion.article>
                        ))}
                      </AnimatePresence>
                      {items.length === 0 ? (
                        <p className="grid flex-1 place-items-center rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-[12.5px] text-ink-3">
                          Nenhuma proposta
                        </p>
                      ) : null}
                    </div>
                  </section>
                )
              })}
            </div>
          </LayoutGroup>
        </>
      )}

      <ProposalForm open={form.open} proposal={form.item} onClose={form.close} />
      <SaleForm open={convert.open} proposal={convert.item ?? undefined} onClose={convert.close} />
      <LostDialog proposal={lose.open ? lose.item : null} onClose={lose.close} />
    </>
  )
}

function IconAction({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid size-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

function LostDialog({ proposal, onClose }: { proposal: Proposal | null; onClose: () => void }) {
  const run = useAction()
  const [reason, setReason] = useState('')
  return (
    <Modal
      open={proposal !== null}
      onClose={onClose}
      size="sm"
      title="Marcar como perdida"
      description="Registrar o motivo ajuda a entender onde o pipeline vaza."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" form="lost-form">
            Marcar como perdida
          </Button>
        </>
      }
    >
      <form
        id="lost-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!proposal) return
          if (await run(() => repo.moveProposal(proposal.id, 'lost', { lostReason: reason }), 'Proposta marcada como perdida')) {
            setReason('')
            onClose()
          }
        }}
      >
        <TextField
          label="Motivo"
          optional
          placeholder="Ex.: preço, prazo, escolheu concorrente…"
          value={reason}
          onValueChange={setReason}
          maxLength={500}
        />
      </form>
    </Modal>
  )
}
