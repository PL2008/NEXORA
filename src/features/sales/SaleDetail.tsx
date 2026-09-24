import { CalendarClock, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useData } from '@/app/useData'
import { Meter } from '@/components/charts/Meter'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import { NativeSelect } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { repo } from '@/db/repo'
import { PAYMENT_MODE_LABEL, PROJECT_STATUS_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { receivableState, saleSummary } from '@/domain/metrics'
import { PROJECT_STATUSES, type ProjectStatus, type Receivable, type Sale } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatDate, relativeDays } from '@/lib/dates'
import { formatBRL, formatPercent } from '@/lib/money'
import { useRetained } from '@/hooks/useRetained'
import { ReceiveDialog } from '../receivables/ReceiveDialog'
import { ReceivableBadge } from '../shared'
import { useAction, useClientName } from '../hooks'

export function SaleDetail({
  sale: current,
  onClose,
  onEdit,
}: {
  sale: Sale | null
  onClose: () => void
  onEdit: (s: Sale) => void
}) {
  const clientName = useClientName()
  const sale = useRetained(current)
  return (
    <Modal
      open={current !== null}
      onClose={onClose}
      size="lg"
      initialFocus="panel"
      title={sale?.title ?? ''}
      description={sale ? `${clientName(sale.clientId)} · ${SERVICE_TYPE_LABEL[sale.serviceType]}` : undefined}
      footer={sale ? <DetailFooter sale={sale} onClose={onClose} onEdit={onEdit} /> : null}
    >
      {sale ? <DetailBody sale={sale} /> : null}
    </Modal>
  )
}

function DetailFooter({ sale, onClose, onEdit }: { sale: Sale; onClose: () => void; onEdit: (s: Sale) => void }) {
  const confirm = useConfirm()
  const run = useAction()
  const { ds } = useData()
  const paid = ds.receivables.filter((r) => r.saleId === sale.id && r.paidDate).length
  return (
    <>
      <Button
        variant="ghost"
        className="text-bad hover:bg-bad-soft hover:text-bad sm:mr-auto"
        icon={<Trash2 className="size-4" />}
        onClick={async () => {
          const ok = await confirm({
            title: 'Excluir esta venda?',
            description:
              paid > 0
                ? `As ${paid === 1 ? 'parcela recebida' : `${paid} parcelas recebidas`} também sairão do histórico de receita. Esta ação não pode ser desfeita.`
                : 'A venda e suas parcelas serão removidas. Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir venda',
            tone: 'danger',
          })
          if (ok && (await run(() => repo.deleteSale(sale.id), 'Venda excluída'))) onClose()
        }}
      >
        Excluir
      </Button>
      <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => onEdit(sale)}>
        Editar
      </Button>
    </>
  )
}

function DetailBody({ sale }: { sale: Sale }) {
  const { ds, today } = useData()
  const run = useAction()
  const [receiving, setReceiving] = useState<Receivable | null>(null)
  const s = saleSummary(sale, ds.receivables, today)
  const proposal = sale.proposalId ? ds.proposals.find((p) => p.id === sale.proposalId) : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-ink-3">
          Status
          <NativeSelect
            aria-label="Status do projeto"
            value={sale.status}
            size="sm"
            onChange={(e) => void run(() => repo.setSaleStatus(sale.id, e.target.value as ProjectStatus), 'Status atualizado')}
          >
            {PROJECT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {PROJECT_STATUS_LABEL[st]}
              </option>
            ))}
          </NativeSelect>
        </label>
        {sale.deadline ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
            <CalendarClock className="size-4" /> Prazo {formatDate(sale.deadline)}
            {sale.status !== 'delivered' && sale.status !== 'cancelled' ? ` (${relativeDays(sale.deadline, today)})` : ''}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Valor total" value={formatBRL(sale.totalCents)} />
        <Stat label="Recebido" value={formatBRL(s.paidCents)} />
        <Stat
          label="A receber"
          value={formatBRL(s.openCents + s.overdueCents)}
          tone={s.overdueCents > 0 ? 'bad' : undefined}
          hint={s.overdueCents > 0 ? `${formatBRL(s.overdueCents)} atrasado` : undefined}
        />
        <Stat
          label="Margem"
          value={formatBRL(s.marginCents)}
          hint={s.marginRatio !== null ? formatPercent(s.marginRatio) : undefined}
          tone={s.marginCents < 0 ? 'bad' : undefined}
        />
      </div>
      <div>
        <div className="mb-2 flex justify-between text-[12.5px] text-ink-3">
          <span>
            {s.paidCount} de {s.installments.length} parcelas recebidas
          </span>
          <span className="tnum">{formatPercent(s.progress)}</span>
        </div>
        <Meter ratio={s.progress} label="Percentual recebido da venda" height={8} />
      </div>

      <section aria-label="Parcelas">
        <h3 className="mb-2 text-[13px] font-semibold text-ink">
          Parcelas <span className="font-normal text-ink-3">· {PAYMENT_MODE_LABEL[sale.paymentMode]}</span>
        </h3>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {s.installments.map((r) => {
            const state = receivableState(r, today, sale)
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                <span className="tnum w-8 shrink-0 text-[12.5px] font-medium text-ink-3">
                  {r.number}/{r.count}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="tnum text-sm font-medium whitespace-nowrap text-ink">{formatBRL(r.amountCents)}</p>
                  <p className="tnum text-[12.5px] text-ink-3">
                    {r.paidDate
                      ? `Recebida em ${formatDate(r.paidDate)}`
                      : `Vence ${formatDate(r.dueDate)} · ${relativeDays(r.dueDate, today)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <ReceivableBadge state={state} />
                  {state === 'paid' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw className="size-3.5" />}
                      onClick={() => void run(() => repo.markReceivableUnpaid(r.id), 'Pagamento desfeito')}
                    >
                      Desfazer
                    </Button>
                  ) : state !== 'void' ? (
                    <Button size="sm" variant="secondary" onClick={() => setReceiving(r)}>
                      Receber
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Custos do projeto">
        <h3 className="mb-2 text-[13px] font-semibold text-ink">Custos do projeto</h3>
        {sale.costs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-[13px] text-ink-3">
            Nenhum custo registrado — a margem é igual ao valor da venda.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {sale.costs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-ink-2">{c.description}</span>
                <span className="tnum font-medium text-ink">{formatBRL(c.amountCents)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 bg-surface-2/60 px-4 py-2.5 text-sm">
              <span className="font-medium text-ink">Total de custos</span>
              <span className="tnum font-semibold text-ink">{formatBRL(s.costsCents)}</span>
            </li>
          </ul>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <Info label="Data da venda" value={formatDate(sale.date)} />
        <Info label="Prazo de entrega" value={formatDate(sale.deadline)} />
        <Info
          label="Cliente"
          value={
            <Link className="text-accent-ink hover:underline" to={`/clientes/${sale.clientId}`}>
              Ver cliente
            </Link>
          }
        />
        {proposal ? <Info label="Origem" value={`Proposta “${proposal.title}”`} /> : null}
        {sale.notes ? (
          <Info
            label="Observações"
            value={<span className="whitespace-pre-wrap">{sale.notes}</span>}
            className="col-span-2 sm:col-span-3"
          />
        ) : null}
      </dl>

      <ReceiveDialog receivable={receiving} onClose={() => setReceiving(null)} />
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string | undefined
  tone?: 'bad' | undefined
}) {
  return (
    <div className="rounded-xl bg-surface-2/70 px-3.5 py-3">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={cn('tnum mt-0.5 truncate text-[15px] font-semibold', tone === 'bad' ? 'text-bad' : 'text-ink')}>{value}</p>
      {hint ? <p className="tnum text-[12px] text-ink-3">{hint}</p> : null}
    </div>
  )
}

function Info({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  )
}
