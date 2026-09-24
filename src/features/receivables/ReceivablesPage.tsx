import { CalendarCheck2, CheckCircle2, RotateCcw, Wallet } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { repo } from '@/db/repo'
import { describeReceivable, receivableState, type ReceivableState } from '@/domain/metrics'
import type { Receivable } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatDate, relativeDays } from '@/lib/dates'
import { formatBRL } from '@/lib/money'
import { MiniStat, ReceivableBadge, SearchInput } from '../shared'
import { matches, useAction, useClientName, useIndex } from '../hooks'
import { ReceiveDialog } from './ReceiveDialog'

type Tab = 'abertos' | 'atrasados' | 'pagos' | 'todos'
const TABS: Tab[] = ['abertos', 'atrasados', 'pagos', 'todos']
const TAB_LABEL: Record<Tab, string> = { abertos: 'Em aberto', atrasados: 'Atrasados', pagos: 'Pagos', todos: 'Todos' }

export function ReceivablesPage() {
  const { ds, today } = useData()
  const index = useIndex()
  const clientName = useClientName()
  const run = useAction()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('aba')
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'abertos'
  const [query, setQuery] = useState('')
  const [receiving, setReceiving] = useState<Receivable | null>(null)

  const all = useMemo(
    () =>
      ds.receivables.map((r) => ({
        r,
        state: receivableState(r, today, r.saleId ? index.sales.get(r.saleId) : null),
        d: describeReceivable(r, index),
      })),
    [ds.receivables, index, today],
  )

  const byTab = (t: Tab, s: ReceivableState) =>
    t === 'todos' ? true : t === 'abertos' ? s === 'open' : t === 'atrasados' ? s === 'overdue' : s === 'paid'

  const counts = Object.fromEntries(TABS.map((t) => [t, all.filter((x) => byTab(t, x.state)).length])) as Record<Tab, number>
  const list = all
    .filter((x) => byTab(tab, x.state))
    .filter((x) => matches(query, clientName(x.r.clientId), x.d.title, x.d.detail))
    .sort((a, b) =>
      tab === 'pagos'
        ? (b.r.paidDate ?? '').localeCompare(a.r.paidDate ?? '')
        : tab === 'todos'
          ? b.r.dueDate.localeCompare(a.r.dueDate)
          : a.r.dueDate.localeCompare(b.r.dueDate),
    )
  const total = list.reduce((acc, x) => acc + x.r.amountCents, 0)
  const sum = (s: ReceivableState) => all.filter((x) => x.state === s).reduce((a, x) => a + x.r.amountCents, 0)

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    if (t === 'abertos') next.delete('aba')
    else next.set('aba', t)
    setParams(next, { replace: true })
  }

  if (ds.receivables.length === 0) {
    return (
      <>
        <PageHeader title="Recebimentos" description="Parcelas de vendas e mensalidades de contratos" />
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<Wallet />}
            title="Nenhuma parcela ainda"
            description="As parcelas aparecem aqui quando você registra uma venda ou um contrato recorrente."
            action={
              <>
                <Link
                  to="/vendas?nova=1"
                  className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-inverse"
                >
                  Registrar venda
                </Link>
                <Link
                  to="/contratos"
                  className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink"
                >
                  Novo contrato
                </Link>
              </>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Recebimentos" description="Parcelas de vendas e mensalidades de contratos" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniStat
          label="Em aberto"
          value={formatBRL(sum('open'))}
          hint={`${counts.abertos} ${counts.abertos === 1 ? 'parcela' : 'parcelas'}`}
        />
        <MiniStat
          label="Atrasados"
          value={formatBRL(sum('overdue'))}
          hint={`${counts.atrasados} ${counts.atrasados === 1 ? 'parcela' : 'parcelas'}`}
          tone={counts.atrasados > 0 ? 'bad' : undefined}
        />
        <div className="col-span-2 lg:col-span-1">
          <MiniStat
            label="Recebido (total)"
            value={formatBRL(sum('paid'))}
            hint={`${counts.pagos} ${counts.pagos === 1 ? 'parcela' : 'parcelas'}`}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Filtrar recebimentos"
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({ value: t, label: TAB_LABEL[t], count: counts[t] }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente ou projeto" label="Buscar recebimentos" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {list.length === 0 ? (
          <EmptyState
            compact
            icon={tab === 'atrasados' ? <CheckCircle2 /> : <CalendarCheck2 />}
            title={
              query
                ? 'Nada encontrado'
                : tab === 'atrasados'
                  ? 'Nenhum atraso'
                  : tab === 'abertos'
                    ? 'Nada em aberto'
                    : 'Nenhum pagamento registrado'
            }
            description={
              query ? 'Tente outro termo de busca.' : tab === 'atrasados' ? 'Todos os clientes estão em dia.' : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5 text-[12.5px] text-ink-3">
              <span>
                {list.length} {list.length === 1 ? 'parcela' : 'parcelas'}
              </span>
              <span className="tnum">
                Total <span className="font-semibold text-ink">{formatBRL(total)}</span>
              </span>
            </div>
            <ul className="divide-y divide-line" aria-label="Parcelas">
              <AnimatePresence initial={false}>
                {list.map(({ r, state, d }) => (
                  <motion.li
                    key={r.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3 sm:flex sm:px-5"
                  >
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate text-sm font-medium text-ink">{clientName(r.clientId)}</p>
                      <p className="truncate text-[12.5px] text-ink-3">
                        {r.saleId ? (
                          <Link to={`/vendas?id=${r.saleId}`} className="hover:text-ink hover:underline">
                            {d.title}
                          </Link>
                        ) : (
                          d.title
                        )}{' '}
                        · {d.detail}
                      </p>
                    </div>
                    <div className="tnum text-right whitespace-nowrap sm:w-44">
                      <p className="text-sm font-semibold text-ink">{formatBRL(r.amountCents)}</p>
                      <p className={cn('text-[12px]', state === 'overdue' ? 'text-bad' : 'text-ink-3')}>
                        {r.paidDate
                          ? `Pago ${formatDate(r.paidDate)}`
                          : `${formatDate(r.dueDate)} · ${relativeDays(r.dueDate, today)}`}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                      <span className="sm:w-[92px]">
                        <ReceivableBadge state={state} />
                      </span>
                      {state === 'paid' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="sm:w-[104px]"
                          icon={<RotateCcw className="size-3.5" />}
                          onClick={() => void run(() => repo.markReceivableUnpaid(r.id), 'Pagamento desfeito')}
                        >
                          Desfazer
                        </Button>
                      ) : state === 'void' ? (
                        <span className="sm:w-[104px]" />
                      ) : (
                        <Button size="sm" variant="secondary" className="sm:w-[104px]" onClick={() => setReceiving(r)}>
                          Receber
                        </Button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>
      <ReceiveDialog receivable={receiving} onClose={() => setReceiving(null)} />
    </>
  )
}
