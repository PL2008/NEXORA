import { ArrowRight, CalendarCheck2, Plus, Sparkles, Target, UserPlus, Wallet } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useData } from '@/app/useData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ChartCard } from '@/components/charts/ChartCard'
import { Funnel } from '@/components/charts/Funnel'
import { HBarList } from '@/components/charts/HBarList'
import { LineChart } from '@/components/charts/LineChart'
import { Meter } from '@/components/charts/Meter'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PROPOSAL_STAGE_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { describeReceivable, hasAnyData, overviewMetrics } from '@/domain/metrics'
import { comparisonLabel, isPeriodPreset, resolvePeriod, type PeriodPreset } from '@/domain/period'
import type { Receivable } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatDayMonth, formatMonthKey, parseISODate, relativeDays, MONTHS_LONG, weekdayLong } from '@/lib/dates'
import { formatBRL, formatCompactBRL, formatInteger, formatPercent } from '@/lib/money'
import { ReceiveDialog } from '../receivables/ReceiveDialog'
import { useClientName, useIndex } from '../hooks'
import { PeriodFilter } from './PeriodFilter'
import { Delta, StatCard } from './StatCard'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function useOverviewPeriod(today: string) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('periodo')
  const preset: PeriodPreset = isPeriodPreset(raw) ? raw : 'this-month'
  const period = resolvePeriod(preset, today, { start: params.get('de') ?? undefined, end: params.get('ate') ?? undefined })
  const setPeriod = (p: PeriodPreset, custom?: { start: string; end: string }) => {
    const next = new URLSearchParams()
    if (p !== 'this-month') next.set('periodo', p)
    if (p === 'custom' && custom) {
      next.set('de', custom.start)
      next.set('ate', custom.end)
    }
    setParams(next, { replace: true })
  }
  return [period, setPeriod] as const
}

export function OverviewPage() {
  const { ds, today } = useData()
  const navigate = useNavigate()
  const [period, setPeriod] = useOverviewPeriod(today)
  const m = useMemo(() => overviewMetrics(ds, period, today), [ds, period, today])
  useDocumentTitle('Visão geral')
  const { year, month, day } = parseISODate(today)
  const vs = comparisonLabel(period, today)

  const header = (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[13px] text-ink-3">
          {capitalize(weekdayLong(today))}, {day} de {MONTHS_LONG[month - 1]} de {year}
        </p>
        <h1 className="mt-0.5 text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-2xl">
          {ds.settings.companyName ? `Olá, ${ds.settings.companyName}` : 'Visão geral'}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasAnyData(ds) ? <PeriodFilter key={`${period.start}${period.end}`} period={period} onChange={setPeriod} /> : null}
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate('/vendas?nova=1')}>
          Nova venda
        </Button>
      </div>
    </div>
  )

  if (!hasAnyData(ds)) {
    return (
      <>
        {header}
        <Onboarding goalSet={ds.settings.monthlyGoalCents > 0} />
      </>
    )
  }

  const monthlyLabels = m.monthly.map((p) => formatMonthKey(p.month))
  const monthlyLong = m.monthly.map((p) => formatMonthKey(p.month, 'long'))
  const cur = m.current
  const prev = m.previous

  return (
    <>
      {header}
      <h2 className="sr-only">Indicadores do período: {period.label}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          index={0}
          hero
          className="col-span-2 lg:col-span-1"
          label="Receita recebida"
          value={formatBRL(cur.revenueCents)}
          delta={<Delta current={cur.revenueCents} previous={prev.revenueCents} label={vs} />}
          trend={{ values: m.monthly.map((p) => p.revenueCents), label: 'Tendência de receita nos últimos 12 meses' }}
        />
        <StatCard
          index={1}
          hero
          className="col-span-2 lg:col-span-1"
          label="Lucro"
          value={<span className={cur.profitCents < 0 ? 'text-bad' : undefined}>{formatBRL(cur.profitCents)}</span>}
          delta={<Delta current={cur.profitCents} previous={prev.profitCents} label={vs} />}
          sub={cur.margin !== null ? `Margem de ${formatPercent(cur.margin)}` : 'Sem receita no período'}
          trend={{ values: m.monthly.map((p) => p.profitCents), label: 'Tendência de lucro nos últimos 12 meses' }}
        />
        <StatCard
          index={2}
          label="Despesas"
          value={formatBRL(cur.expensesCents)}
          delta={<Delta current={cur.expensesCents} previous={prev.expensesCents} upIsGood={false} label={vs} />}
          sub={
            cur.projectCostsCents > 0
              ? `Inclui ${formatCompactBRL(cur.projectCostsCents)} de custos de projetos`
              : 'Somente despesas operacionais'
          }
          trend={{ values: m.monthly.map((p) => p.expensesCents), label: 'Tendência de despesas nos últimos 12 meses' }}
        />
        <StatCard
          index={3}
          label="A receber"
          value={formatBRL(m.receivables.openCents + m.receivables.overdueCents)}
          sub={`${formatBRL(m.receivables.next30Cents)} nos próximos 30 dias`}
        >
          <Link
            to="/recebimentos?aba=atrasados"
            className={cn(
              'mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium transition-colors',
              m.receivables.overdueCount > 0 ? 'bg-bad-soft text-bad hover:bg-bad/15' : 'bg-good-soft text-good',
            )}
          >
            {m.receivables.overdueCount > 0
              ? `${formatBRL(m.receivables.overdueCents)} atrasados (${m.receivables.overdueCount})`
              : 'Nada atrasado'}
          </Link>
        </StatCard>
        <StatCard
          index={4}
          label="Vendas fechadas"
          value={formatInteger(cur.salesCount)}
          delta={<Delta current={cur.salesCount} previous={prev.salesCount} label={vs} />}
          sub={`${formatBRL(cur.salesValueCents)} vendidos`}
        />
        <StatCard
          index={5}
          label="Ticket médio"
          value={formatBRL(cur.averageTicketCents)}
          delta={
            cur.salesCount > 0 ? (
              <Delta current={cur.averageTicketCents} previous={prev.averageTicketCents} label={vs} />
            ) : undefined
          }
          sub={cur.salesCount > 0 ? `Em ${cur.salesCount} ${cur.salesCount === 1 ? 'venda' : 'vendas'}` : 'Sem vendas no período'}
        />
        <StatCard
          index={6}
          label="MRR"
          value={formatBRL(m.mrr.cents)}
          sub={
            m.mrr.activeCount > 0 ? (
              `${m.mrr.activeCount} ${m.mrr.activeCount === 1 ? 'contrato ativo' : 'contratos ativos'} · ${formatCompactBRL(m.mrr.cents * 12)}/ano`
            ) : (
              <Link to="/contratos" className="text-accent-ink hover:underline">
                Cadastrar contrato recorrente
              </Link>
            )
          }
        />
        <GoalCard goal={m.goal} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Receita x despesas"
          subtitle="Últimos 12 meses · despesas incluem custos de projetos"
          table={{
            caption: 'Receita, despesas e lucro por mês',
            columns: [
              { key: 'month', label: 'Mês' },
              { key: 'revenue', label: 'Receita', align: 'right' },
              { key: 'expenses', label: 'Despesas', align: 'right' },
              { key: 'profit', label: 'Lucro', align: 'right' },
            ],
            rows: m.monthly.map((p, i) => ({
              id: p.month,
              month: monthlyLong[i],
              revenue: formatBRL(p.revenueCents),
              expenses: formatBRL(p.expensesCents),
              profit: formatBRL(p.profitCents),
            })),
          }}
        >
          <LineChart
            ariaLabel="Receita e despesas nos últimos 12 meses"
            labels={monthlyLabels}
            tooltipLabels={monthlyLong}
            formatValue={(v) => formatBRL(v)}
            formatAxis={formatCompactBRL}
            series={[
              {
                key: 'revenue',
                label: 'Receita',
                color: 'var(--series-1)',
                values: m.monthly.map((p) => p.revenueCents),
                area: true,
              },
              { key: 'expenses', label: 'Despesas', color: 'var(--series-2)', values: m.monthly.map((p) => p.expensesCents) },
            ]}
          />
        </ChartCard>
        <ChartCard
          title="Receita por tipo de serviço"
          subtitle={period.label}
          table={{
            caption: 'Receita recebida por tipo de serviço',
            columns: [
              { key: 'type', label: 'Serviço' },
              { key: 'value', label: 'Receita', align: 'right' },
              { key: 'share', label: '%', align: 'right' },
            ],
            rows: m.byService.map((r) => ({
              id: r.key,
              type: SERVICE_TYPE_LABEL[r.key],
              value: formatBRL(r.cents),
              share: formatPercent(r.share),
            })),
          }}
        >
          {m.byService.length === 0 ? (
            <EmptyState
              compact
              icon={<Sparkles />}
              title="Sem receita no período"
              description="Quando parcelas forem recebidas, a divisão por serviço aparece aqui."
            />
          ) : (
            <HBarList
              ariaLabel="Receita por tipo de serviço"
              formatValue={(v) => formatBRL(v)}
              items={m.byService.map((r) => ({ key: r.key, label: SERVICE_TYPE_LABEL[r.key], value: r.cents, share: r.share }))}
            />
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TopClients items={m.topClients} periodLabel={period.label} />
        <Upcoming items={m.upcoming.map((u) => u.receivable)} today={today} />
        <ChartCard
          title="Funil de propostas"
          subtitle={`Propostas criadas · ${period.label.toLowerCase()}`}
          table={{
            caption: 'Funil de propostas por etapa',
            columns: [
              { key: 'stage', label: 'Etapa' },
              { key: 'count', label: 'Qtd.', align: 'right' },
              { key: 'value', label: 'Valor', align: 'right' },
              { key: 'rate', label: 'Conversão', align: 'right' },
            ],
            rows: m.funnel.steps.map((s) => ({
              id: s.stage,
              stage: PROPOSAL_STAGE_LABEL[s.stage],
              count: formatInteger(s.count),
              value: formatBRL(s.valueCents),
              rate: s.rate === null ? '—' : formatPercent(s.rate),
            })),
          }}
        >
          {m.funnel.total === 0 ? (
            <EmptyState
              compact
              icon={<Target />}
              title="Nenhuma proposta no período"
              action={
                <Button size="sm" variant="secondary" onClick={() => navigate('/propostas')}>
                  Abrir pipeline
                </Button>
              }
            />
          ) : (
            <>
              <Funnel data={m.funnel} />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <FunnelStat label="Taxa de ganho" value={m.funnel.winRate === null ? '—' : formatPercent(m.funnel.winRate)} />
                <FunnelStat label="Em aberto" value={formatCompactBRL(m.funnel.openValueCents)} />
                <FunnelStat label="Perdidas" value={formatInteger(m.funnel.lostCount)} />
              </div>
            </>
          )}
        </ChartCard>
      </div>
    </>
  )
}

function FunnelStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tnum text-[15px] font-semibold text-ink">{value}</p>
      <p className="text-[11.5px] text-ink-3">{label}</p>
    </div>
  )
}

function GoalCard({ goal }: { goal: ReturnType<typeof overviewMetrics>['goal'] }) {
  const monthName = MONTHS_LONG[Number(goal.month.slice(5)) - 1]
  if (goal.goalCents <= 0) {
    return (
      <StatCard index={7} label={`Meta de ${monthName}`} value={<span className="text-ink-3">—</span>}>
        <Link
          to="/configuracoes#meta"
          className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:underline"
        >
          Definir meta mensal <ArrowRight className="size-3.5" />
        </Link>
      </StatCard>
    )
  }
  const ratio = goal.ratio ?? 0
  const remaining = goal.goalCents - goal.achievedCents
  return (
    <StatCard
      index={7}
      label={`Meta de ${monthName}`}
      value={formatPercent(ratio)}
      sub={
        remaining > 0
          ? `Faltam ${formatBRL(remaining)} de ${formatCompactBRL(goal.goalCents)}`
          : `Meta de ${formatCompactBRL(goal.goalCents)} atingida`
      }
    >
      <div className="mt-auto pt-3">
        <Meter ratio={ratio} label={`Meta do mês: ${formatPercent(ratio)} atingido`} />
      </div>
    </StatCard>
  )
}

function TopClients({ items, periodLabel }: { items: ReturnType<typeof overviewMetrics>['topClients']; periodLabel: string }) {
  const clientName = useClientName()
  return (
    <ChartCard
      title="Maiores clientes"
      subtitle={`Receita recebida · ${periodLabel.toLowerCase()}`}
      table={{
        caption: 'Maiores clientes por receita recebida',
        columns: [
          { key: 'client', label: 'Cliente' },
          { key: 'value', label: 'Receita', align: 'right' },
          { key: 'share', label: '%', align: 'right' },
        ],
        rows: items.map((c) => ({
          id: c.key,
          client: clientName(c.key),
          value: formatBRL(c.cents),
          share: formatPercent(c.share),
        })),
      }}
    >
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={<UserPlus />}
          title="Nenhum recebimento no período"
          description="Os clientes que mais pagaram aparecem aqui."
        />
      ) : (
        <HBarList
          ariaLabel="Maiores clientes"
          formatValue={(v) => formatBRL(v)}
          items={items.map((c) => ({
            key: c.key,
            label: (
              <Link to={`/clientes/${c.key}`} className="hover:underline">
                {clientName(c.key)}
              </Link>
            ),
            value: c.cents,
            share: c.share,
          }))}
        />
      )}
    </ChartCard>
  )
}

function Upcoming({ items, today }: { items: Receivable[]; today: string }) {
  const index = useIndex()
  const clientName = useClientName()
  const [receiving, setReceiving] = useState<Receivable | null>(null)
  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader
        title="Próximos recebimentos"
        subtitle="Parcelas em aberto por vencimento"
        actions={
          <Link
            to="/recebimentos"
            className="rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            Ver todos
          </Link>
        }
      />
      <div className="flex-1 px-3 pt-3 pb-3">
        {items.length === 0 ? (
          <EmptyState compact icon={<CalendarCheck2 />} title="Tudo em dia" description="Não há parcelas em aberto." />
        ) : (
          <ul className="flex flex-col">
            {items.map((r, i) => {
              const d = describeReceivable(r, index)
              const overdue = r.dueDate < today
              return (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/70"
                >
                  <div
                    className={cn(
                      'grid w-11 shrink-0 place-items-center rounded-lg py-1 text-center',
                      overdue ? 'bg-bad-soft text-bad' : 'bg-surface-2 text-ink-2',
                    )}
                  >
                    <span className="tnum text-[13px] leading-tight font-semibold">
                      {formatDayMonth(r.dueDate).split(' ')[0]}
                    </span>
                    <span className="text-[10.5px] leading-tight uppercase">{formatDayMonth(r.dueDate).split(' ')[1]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{clientName(r.clientId)}</p>
                    <p className="truncate text-[12px] text-ink-3">
                      {overdue ? (
                        <span className="text-bad">Atrasado {relativeDays(r.dueDate, today)}</span>
                      ) : (
                        capitalize(relativeDays(r.dueDate, today))
                      )}{' '}
                      · {d.title}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="tnum text-[13.5px] font-semibold text-ink">{formatBRL(r.amountCents)}</span>
                    <button
                      type="button"
                      onClick={() => setReceiving(r)}
                      className="text-[12px] font-medium text-accent-ink hover:underline"
                      aria-label={`Receber ${formatBRL(r.amountCents)} de ${clientName(r.clientId)}`}
                    >
                      Receber
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
      <ReceiveDialog receivable={receiving} onClose={() => setReceiving(null)} />
    </Card>
  )
}

function Onboarding({ goalSet }: { goalSet: boolean }) {
  const steps = [
    {
      icon: <UserPlus />,
      title: 'Cadastre um cliente',
      text: 'Nome, contato e empresa.',
      to: '/clientes?novo=1',
      cta: 'Novo cliente',
    },
    {
      icon: <Wallet />,
      title: 'Registre uma venda',
      text: 'Valor, parcelas, custos e prazo.',
      to: '/vendas?nova=1',
      cta: 'Nova venda',
    },
    {
      icon: <Target />,
      title: goalSet ? 'Meta definida' : 'Defina sua meta mensal',
      text: 'Acompanhe o progresso do mês.',
      to: '/configuracoes#meta',
      cta: goalSet ? 'Ajustar meta' : 'Definir meta',
    },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="overflow-hidden">
        <div className="relative border-b border-line px-6 py-10 text-center sm:px-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_80%_at_50%_0%,var(--accent-soft),transparent_70%)]"
          />
          <div className="relative">
            <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl border border-line bg-surface text-ink shadow-card">
              <Sparkles className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-[22px]">Tudo pronto para começar</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-3">
              O painel começa vazio. Cada número e gráfico aqui será calculado a partir do que você cadastrar — nada é simulado.
            </p>
          </div>
        </div>
        <ol className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 px-6 py-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink-2 [&_svg]:size-[18px]">
                  {s.icon}
                </span>
                <span className="tnum text-[12px] font-medium text-ink-3">Passo {i + 1}</span>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-ink">{s.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-3">{s.text}</p>
              </div>
              <Link
                to={s.to}
                className="mt-auto inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline"
              >
                {s.cta} <ArrowRight className="size-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </motion.div>
  )
}
