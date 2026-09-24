import { ChevronRight, Plus, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { NativeSelect } from '@/components/ui/fields'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { clientStats, emptyClientStats } from '@/domain/metrics'
import { formatDate } from '@/lib/dates'
import { formatBRL, formatInteger } from '@/lib/money'
import { MiniStat, SearchInput } from '../shared'
import { matches } from '../hooks'
import { ClientForm } from './ClientForm'

type Sort = 'ltv' | 'name' | 'recent' | 'open'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase()
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={
        size === 'lg'
          ? 'grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-lg font-semibold text-ink-2 ring-1 ring-line ring-inset'
          : 'grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[12.5px] font-semibold text-ink-2 ring-1 ring-line ring-inset'
      }
    >
      {initials(name) || '?'}
    </span>
  )
}

export function ClientsPage() {
  const { ds, today } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('ltv')
  const creating = params.get('novo') === '1'
  const stats = useMemo(() => clientStats(ds, today), [ds, today])

  const rows = useMemo(() => {
    const list = ds.clients
      .filter((c) => matches(query, c.name, c.company, c.email, c.phone, c.document))
      .map((c) => ({ c, s: stats.get(c.id) ?? emptyClientStats(c.id) }))
    const byName = (a: (typeof list)[number], b: (typeof list)[number]) => a.c.name.localeCompare(b.c.name, 'pt-BR')
    return list.sort((a, b) => {
      if (sort === 'name') return byName(a, b)
      if (sort === 'recent')
        return (b.s.lastDealDate ?? b.c.createdAt).localeCompare(a.s.lastDealDate ?? a.c.createdAt) || byName(a, b)
      if (sort === 'open') return b.s.openCents + b.s.overdueCents - (a.s.openCents + a.s.overdueCents) || byName(a, b)
      return b.s.ltvCents - a.s.ltvCents || byName(a, b)
    })
  }, [ds.clients, query, sort, stats])

  const totalLtv = [...stats.values()].reduce((a, s) => a + s.ltvCents, 0)
  const buyers = [...stats.values()].filter((s) => s.ltvCents > 0).length
  const recurring = [...stats.values()].filter((s) => s.activeContracts > 0).length

  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('novo')
    setParams(next, { replace: true })
  }
  const open = () => {
    const next = new URLSearchParams(params)
    next.set('novo', '1')
    setParams(next, { replace: true })
  }

  const newButton = (
    <Button variant="primary" icon={<Plus className="size-4" />} onClick={open}>
      Novo cliente
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Clientes"
        description={
          ds.clients.length ? `${formatInteger(ds.clients.length)} cadastrados` : 'Carteira de clientes e valor gerado'
        }
        actions={newButton}
      />
      {ds.clients.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<Users />}
            title="Nenhum cliente cadastrado"
            description="Cadastre clientes para vincular vendas, contratos e propostas — e acompanhar o LTV de cada um."
            action={newButton}
          />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MiniStat label="LTV total recebido" value={formatBRL(totalLtv)} />
            <MiniStat
              label="LTV médio"
              value={formatBRL(buyers > 0 ? Math.round(totalLtv / buyers) : 0)}
              hint={`${buyers} ${buyers === 1 ? 'cliente pagante' : 'clientes pagantes'}`}
            />
            <div className="col-span-2 lg:col-span-1">
              <MiniStat label="Com contrato recorrente" value={formatInteger(recurring)} hint={`de ${ds.clients.length}`} />
            </div>
          </div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar nome, empresa, e-mail…" label="Buscar clientes" />
            <NativeSelect
              aria-label="Ordenar clientes"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              size="md"
              className="sm:w-52"
            >
              <option value="ltv">Maior LTV</option>
              <option value="open">Mais a receber</option>
              <option value="recent">Atividade recente</option>
              <option value="name">Nome (A–Z)</option>
            </NativeSelect>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {rows.length === 0 ? (
              <EmptyState compact icon={<Users />} title="Nenhum cliente encontrado" description="Tente outro termo de busca." />
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_20px] gap-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-ink-3 md:grid">
                  <span>Cliente</span>
                  <span className="text-right">LTV (recebido)</span>
                  <span className="text-right">A receber</span>
                  <span className="text-right">MRR</span>
                  <span className="text-right">Última venda</span>
                  <span />
                </div>
                <ul className="divide-y divide-line" aria-label="Clientes">
                  <AnimatePresence initial={false}>
                    {rows.map(({ c, s }) => (
                      <motion.li
                        key={c.id}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Link
                          to={`/clientes/${c.id}`}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_20px]"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Avatar name={c.name} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                              <span className="block truncate text-[12.5px] text-ink-3">
                                {c.company || c.email || c.phone || `${s.salesCount} ${s.salesCount === 1 ? 'venda' : 'vendas'}`}
                              </span>
                            </span>
                          </span>
                          <span className="tnum text-right text-sm font-semibold text-ink">
                            {formatBRL(s.ltvCents)}
                            <span className="block text-[11.5px] font-normal text-ink-3 md:hidden">LTV</span>
                          </span>
                          <span
                            className={`tnum hidden text-right text-sm md:block ${s.overdueCents > 0 ? 'font-medium text-bad' : 'text-ink-2'}`}
                          >
                            {formatBRL(s.openCents + s.overdueCents)}
                          </span>
                          <span className="tnum hidden text-right text-sm text-ink-2 md:block">
                            {s.mrrCents > 0 ? formatBRL(s.mrrCents) : '—'}
                          </span>
                          <span className="tnum hidden text-right text-sm text-ink-2 md:block">{formatDate(s.lastDealDate)}</span>
                          <ChevronRight className="hidden size-4 text-ink-3 md:block" aria-hidden />
                        </Link>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            )}
          </div>
        </>
      )}
      <ClientForm open={creating} client={null} onClose={close} onSaved={(id) => navigate(`/clientes/${id}`)} />
    </>
  )
}
