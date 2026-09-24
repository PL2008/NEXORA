import { ArrowLeft, FileSignature, Mail, Pencil, Phone, Plus, ShoppingBag, Target, Trash2, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import { EmptyState } from '@/components/ui/EmptyState'
import { repo } from '@/db/repo'
import { SERVICE_TYPE_LABEL } from '@/domain/labels'
import { clientStats, describeReceivable, emptyClientStats, receivableState } from '@/domain/metrics'
import { nextContractDueDate as nextDue } from '@/domain/recurring'
import { useDialog } from '@/hooks/useDialog'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate, relativeDays } from '@/lib/dates'
import { formatBRL } from '@/lib/money'
import { ContractStatusBadge, MiniStat, ProjectStatusBadge, ReceivableBadge, Section, StageBadge } from '../shared'
import { useAction, useIndex } from '../hooks'
import { ClientForm } from './ClientForm'
import { Avatar } from './ClientsPage'

export function ClientDetailPage() {
  const { id } = useParams()
  const { ds, today } = useData()
  const index = useIndex()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const run = useAction()
  const edit = useDialog<null>()
  const client = ds.clients.find((c) => c.id === id)
  useDocumentTitle(client?.name ?? 'Cliente')
  const stats = useMemo(
    () => (client ? (clientStats(ds, today).get(client.id) ?? emptyClientStats(client.id)) : null),
    [ds, today, client],
  )

  if (!client || !stats) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title="Cliente não encontrado"
        description="Ele pode ter sido removido."
        action={
          <Button variant="secondary" onClick={() => navigate('/clientes')}>
            Voltar para clientes
          </Button>
        }
      />
    )
  }

  const sales = ds.sales.filter((s) => s.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const contracts = ds.contracts.filter((c) => c.clientId === client.id)
  const proposals = ds.proposals
    .filter((p) => p.clientId === client.id)
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate))
  const open = ds.receivables
    .filter((r) => r.clientId === client.id)
    .map((r) => ({ r, state: receivableState(r, today, r.saleId ? index.sales.get(r.saleId) : null) }))
    .filter((x) => x.state === 'open' || x.state === 'overdue')
    .sort((a, b) => a.r.dueDate.localeCompare(b.r.dueDate))
  const phoneDigits = client.phone.replace(/\D/g, '')

  const onDelete = async () => {
    const ok = await confirm({
      title: `Excluir ${client.name}?`,
      description: 'O cadastro será removido. Clientes com vendas, contratos ou recebimentos não podem ser excluídos.',
      confirmLabel: 'Excluir cliente',
      tone: 'danger',
    })
    if (ok && (await run(() => repo.deleteClient(client.id), 'Cliente excluído'))) navigate('/clientes')
  }

  return (
    <>
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={client.name} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-2xl">{client.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
              {client.company ? <span>{client.company}</span> : null}
              {client.email ? (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-ink">
                  <Mail className="size-3.5" /> {client.email}
                </a>
              ) : null}
              {client.phone ? (
                <a
                  href={
                    phoneDigits.length >= 10
                      ? `https://wa.me/${phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits}`
                      : `tel:${client.phone}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  <Phone className="size-3.5" /> {client.phone}
                </a>
              ) : null}
              {client.document ? <span>{client.document}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir cliente"
            onClick={onDelete}
            className="hover:bg-bad-soft hover:text-bad"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => edit.show(null)}>
            Editar
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => navigate(`/vendas?nova=1&cliente=${client.id}`)}
          >
            Nova venda
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          label="LTV (recebido)"
          value={formatBRL(stats.ltvCents)}
          hint={stats.firstDealDate ? `Cliente desde ${formatDate(stats.firstDealDate)}` : 'Ainda sem negócios'}
        />
        <MiniStat
          label="Total contratado"
          value={formatBRL(stats.soldCents)}
          hint={`${stats.salesCount} ${stats.salesCount === 1 ? 'venda' : 'vendas'}`}
        />
        <MiniStat
          label="A receber"
          value={formatBRL(stats.openCents + stats.overdueCents)}
          hint={stats.overdueCents > 0 ? `${formatBRL(stats.overdueCents)} atrasado` : 'Nada atrasado'}
          tone={stats.overdueCents > 0 ? 'bad' : undefined}
        />
        <MiniStat
          label="MRR"
          value={formatBRL(stats.mrrCents)}
          hint={`${stats.activeContracts} ${stats.activeContracts === 1 ? 'contrato ativo' : 'contratos ativos'}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Vendas"
          actions={
            <Link
              to={`/vendas?nova=1&cliente=${client.id}`}
              className="text-[12.5px] font-medium text-accent-ink hover:underline"
            >
              Nova venda
            </Link>
          }
        >
          {sales.length === 0 ? (
            <EmptyState compact icon={<ShoppingBag />} title="Nenhuma venda para este cliente" />
          ) : (
            <ul className="divide-y divide-line">
              {sales.map((s) => (
                <li key={s.id}>
                  <Link to={`/vendas?id=${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{s.title}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">
                        {SERVICE_TYPE_LABEL[s.serviceType]} · {formatDate(s.date)}
                      </span>
                    </span>
                    <ProjectStatusBadge status={s.status} />
                    <span className="tnum text-sm font-semibold text-ink">{formatBRL(s.totalCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Em aberto" description="Parcelas e mensalidades a receber">
          {open.length === 0 ? (
            <EmptyState compact icon={<Wallet />} title="Nada a receber" />
          ) : (
            <ul className="divide-y divide-line">
              {open.map(({ r, state }) => {
                const d = describeReceivable(r, index)
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{d.title}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">
                        {d.detail} · {formatDate(r.dueDate)} ({relativeDays(r.dueDate, today)})
                      </span>
                    </span>
                    <ReceivableBadge state={state} />
                    <span className="tnum text-sm font-semibold text-ink">{formatBRL(r.amountCents)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Contratos recorrentes"
          actions={
            <Link to="/contratos" className="text-[12.5px] font-medium text-accent-ink hover:underline">
              Gerenciar
            </Link>
          }
        >
          {contracts.length === 0 ? (
            <EmptyState compact icon={<FileSignature />} title="Nenhum contrato" />
          ) : (
            <ul className="divide-y divide-line">
              {contracts.map((c) => {
                const next = nextDue(c, today)
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{c.description}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">
                        {SERVICE_TYPE_LABEL[c.serviceType]}
                        {next ? ` · próxima cobrança ${formatDate(next)}` : ''}
                      </span>
                    </span>
                    <ContractStatusBadge status={c.status} />
                    <span className="tnum text-sm font-semibold text-ink">{formatBRL(c.monthlyCents)}/mês</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Propostas"
          actions={
            <Link to="/propostas" className="text-[12.5px] font-medium text-accent-ink hover:underline">
              Pipeline
            </Link>
          }
        >
          {proposals.length === 0 ? (
            <EmptyState compact icon={<Target />} title="Nenhuma proposta" />
          ) : (
            <ul className="divide-y divide-line">
              {proposals.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.title}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      {SERVICE_TYPE_LABEL[p.serviceType]} · {formatDate(p.createdDate)}
                    </span>
                  </span>
                  <StageBadge stage={p.stage} />
                  <span className="tnum text-sm font-semibold text-ink">{formatBRL(p.valueCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {client.notes ? (
        <Section title="Observações" className="mt-4">
          <p className="px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{client.notes}</p>
        </Section>
      ) : null}

      <ClientForm open={edit.open} client={client} onClose={edit.close} />
    </>
  )
}
