import { Plus, ShoppingBag } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { NativeSelect } from '@/components/ui/fields'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PROJECT_STATUS_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { saleSummary } from '@/domain/metrics'
import { PROJECT_STATUSES, SERVICE_TYPES, type ProjectStatus, type Sale, type ServiceType } from '@/domain/types'
import { useDialog } from '@/hooks/useDialog'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'
import { formatBRL, formatInteger, formatPercent } from '@/lib/money'
import { MiniStat, ProjectStatusBadge, SearchInput } from '../shared'
import { matches, useClientName } from '../hooks'
import { SaleDetail } from './SaleDetail'
import { SaleForm } from './SaleForm'

export function SalesPage() {
  const { ds, today } = useData()
  const clientName = useClientName()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [type, setType] = useState<ServiceType | 'all'>('all')
  const editing = useDialog<Sale>()
  const creating = params.get('nova') === '1'
  const detailId = params.get('id')
  const detail = detailId ? (ds.sales.find((s) => s.id === detailId) ?? null) : null

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const rows = useMemo(() => {
    return ds.sales
      .filter((s) => (status === 'all' ? true : s.status === status))
      .filter((s) => (type === 'all' ? true : s.serviceType === type))
      .filter((s) => matches(query, s.title, clientName(s.clientId), SERVICE_TYPE_LABEL[s.serviceType]))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((sale) => ({ sale, summary: saleSummary(sale, ds.receivables, today) }))
  }, [ds.sales, ds.receivables, status, type, query, clientName, today])

  const active = rows.filter((r) => r.sale.status !== 'cancelled')
  const sold = active.reduce((a, r) => a + r.sale.totalCents, 0)
  const received = active.reduce((a, r) => a + r.summary.paidCents, 0)
  const open = active.reduce((a, r) => a + r.summary.openCents + r.summary.overdueCents, 0)
  const margin = active.reduce((a, r) => a + r.summary.marginCents, 0)

  const hasSales = ds.sales.length > 0
  const filtered = query !== '' || status !== 'all' || type !== 'all'

  return (
    <>
      <PageHeader
        title="Vendas"
        description={
          hasSales
            ? `${formatInteger(ds.sales.length)} ${ds.sales.length === 1 ? 'projeto vendido' : 'projetos vendidos'}`
            : 'Projetos fechados, pagamentos e margens'
        }
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setParam('nova', '1')}>
            Nova venda
          </Button>
        }
      />

      {!hasSales ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<ShoppingBag />}
            title="Nenhuma venda registrada"
            description="Registre um projeto fechado para acompanhar parcelas, recebimentos, custos e margem."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setParam('nova', '1')}>
                Registrar primeira venda
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat
              label="Total vendido"
              value={formatBRL(sold)}
              hint={`${active.length} ${active.length === 1 ? 'venda' : 'vendas'}${filtered ? ' no filtro' : ''}`}
            />
            <MiniStat
              label="Recebido"
              value={formatBRL(received)}
              hint={sold > 0 ? `${formatPercent(received / sold)} do vendido` : undefined}
            />
            <MiniStat label="A receber" value={formatBRL(open)} />
            <MiniStat
              label="Margem"
              value={formatBRL(margin)}
              hint={sold > 0 ? `${formatPercent(margin / sold)} média` : undefined}
              tone={margin < 0 ? 'bad' : undefined}
            />
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar projeto ou cliente" label="Buscar vendas" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <NativeSelect
                aria-label="Filtrar por status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus | 'all')}
                size="md"
                className="sm:w-44"
              >
                <option value="all">Todos os status</option>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                aria-label="Filtrar por tipo"
                value={type}
                onChange={(e) => setType(e.target.value as ServiceType | 'all')}
                size="md"
                className="sm:w-48"
              >
                <option value="all">Todos os tipos</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SERVICE_TYPE_LABEL[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {rows.length === 0 ? (
              <EmptyState
                compact
                icon={<ShoppingBag />}
                title="Nenhuma venda encontrada"
                description="Ajuste a busca ou os filtros."
              />
            ) : (
              <>
                <table className="hidden w-full text-sm md:table">
                  <caption className="sr-only">Lista de vendas</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-[12px] text-ink-3">
                      <th scope="col" className="px-5 py-2.5 font-medium">
                        Projeto
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Tipo
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Data
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Recebido
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {rows.map(({ sale, summary }) => (
                        <motion.tr
                          key={sale.id}
                          layout="position"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            'cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2/60',
                            sale.status === 'cancelled' && 'opacity-60',
                          )}
                          onClick={() => setParam('id', sale.id)}
                        >
                          <td className="max-w-[320px] px-5 py-3">
                            <button
                              type="button"
                              className="block max-w-full truncate text-left font-medium text-ink hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setParam('id', sale.id)
                              }}
                            >
                              {sale.title}
                            </button>
                            <p className="truncate text-[12.5px] text-ink-3">{clientName(sale.clientId)}</p>
                          </td>
                          <td className="px-3 py-3 text-ink-2">{SERVICE_TYPE_LABEL[sale.serviceType]}</td>
                          <td className="tnum px-3 py-3 text-ink-2">{formatDate(sale.date)}</td>
                          <td className="px-3 py-3">
                            <ProjectStatusBadge status={sale.status} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                                <div
                                  className="h-full rounded-full bg-accent"
                                  style={{ width: `${Math.min(100, summary.progress * 100)}%` }}
                                />
                              </div>
                              <span className="tnum text-[12.5px] text-ink-3">{formatPercent(summary.progress)}</span>
                              {summary.overdueCents > 0 ? (
                                <span className="text-[12px] font-medium text-bad">· atrasado</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="tnum px-5 py-3 text-right font-medium text-ink">{formatBRL(sale.totalCents)}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                <ul className="divide-y divide-line md:hidden" aria-label="Lista de vendas">
                  {rows.map(({ sale, summary }) => (
                    <li key={sale.id}>
                      <button
                        type="button"
                        onClick={() => setParam('id', sale.id)}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3.5 text-left active:bg-surface-2',
                          sale.status === 'cancelled' && 'opacity-60',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{sale.title}</p>
                          <p className="truncate text-[12.5px] text-ink-3">
                            {clientName(sale.clientId)} · {formatDate(sale.date)}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <ProjectStatusBadge status={sale.status} />
                            {summary.overdueCents > 0 ? (
                              <span className="text-[12px] font-medium text-bad">Parcela atrasada</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="tnum text-sm font-semibold text-ink">{formatBRL(sale.totalCents)}</p>
                          <p className="tnum text-[12px] text-ink-3">{formatPercent(summary.progress)} recebido</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      <SaleDetail
        sale={detail}
        onClose={() => setParam('id', null)}
        onEdit={(s) => {
          setParam('id', null)
          editing.show(s)
        }}
      />
      <SaleForm
        open={creating}
        clientId={params.get('cliente') ?? undefined}
        onClose={() =>
          setParams(
            (p) => {
              const next = new URLSearchParams(p)
              next.delete('nova')
              next.delete('cliente')
              return next
            },
            { replace: true },
          )
        }
        onSaved={(id) =>
          setParams(
            (p) => {
              const next = new URLSearchParams(p)
              next.delete('nova')
              next.delete('cliente')
              next.set('id', id)
              return next
            },
            { replace: true },
          )
        }
      />
      <SaleForm open={editing.open} sale={editing.item ?? undefined} onClose={editing.close} />
    </>
  )
}
