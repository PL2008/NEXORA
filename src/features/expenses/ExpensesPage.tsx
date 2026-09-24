import { ChevronLeft, ChevronRight, PieChart, Plus, Receipt, Repeat } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useSearchParams } from 'react-router'
import { useData } from '@/app/useData'
import { ChartCard } from '@/components/charts/ChartCard'
import { HBarList } from '@/components/charts/HBarList'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { EXPENSE_CATEGORY_LABEL } from '@/domain/labels'
import { expensesByCategory } from '@/domain/metrics'
import type { Expense, RecurringExpense } from '@/domain/types'
import { useDialog } from '@/hooks/useDialog'
import {
  addMonthsToKey,
  formatDate,
  formatMonthKey,
  isValidMonthKey,
  monthEnd,
  monthKey,
  monthStart,
  parseISODate,
} from '@/lib/dates'
import { formatBRL, relativeChange, formatPercent } from '@/lib/money'
import { MiniStat, Section } from '../shared'
import { ExpenseForm, RecurringForm } from './ExpenseForm'

export function ExpensesPage() {
  const { ds, today } = useData()
  const [params, setParams] = useSearchParams()
  const raw = params.get('mes')
  const month = isValidMonthKey(raw) ? raw : monthKey(today)
  const form = useDialog<Expense>()
  const recurringDialog = useDialog<RecurringExpense>()

  const setMonth = (m: string) => {
    const next = new URLSearchParams(params)
    if (m === monthKey(today)) next.delete('mes')
    else next.set('mes', m)
    setParams(next, { replace: true })
  }

  const start = monthStart(month)
  const end = monthEnd(month)
  const range = { start, end }
  const prevMonth = addMonthsToKey(month, -1)
  const items = ds.expenses
    .filter((e) => e.date >= start && e.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const total = items.reduce((a, e) => a + e.amountCents, 0)
  const prevTotal = ds.expenses.filter((e) => e.date.startsWith(prevMonth)).reduce((a, e) => a + e.amountCents, 0)
  const change = relativeChange(total, prevTotal)
  const byCategory = expensesByCategory(ds, range)
  const rules = [...ds.recurringExpenses].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.description.localeCompare(b.description, 'pt-BR'),
  )
  const recurringMonthly = rules.filter((r) => r.active).reduce((a, r) => a + r.amountCents, 0)

  const newButton = (
    <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => form.show(null)}>
      Nova despesa
    </Button>
  )

  if (ds.expenses.length === 0 && ds.recurringExpenses.length === 0) {
    return (
      <>
        <PageHeader title="Despesas" description="Custos operacionais da empresa, por categoria" actions={newButton} />
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<Receipt />}
            title="Nenhuma despesa registrada"
            description="Registre ferramentas, impostos, freelancers e outros custos. Despesas fixas podem se repetir todo mês."
            action={newButton}
          />
        </div>
        <ExpenseForm open={form.open} expense={form.item} onClose={form.close} />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Despesas" description="Custos operacionais da empresa, por categoria" actions={newButton} />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(prevMonth)}>
            <ChevronLeft className="size-[18px]" />
          </Button>
          <h2 className="min-w-[150px] text-center text-[15px] font-semibold text-ink capitalize" aria-live="polite">
            {formatMonthKey(month, 'long')}
          </h2>
          <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(addMonthsToKey(month, 1))}>
            <ChevronRight className="size-[18px]" />
          </Button>
        </div>
        {month !== monthKey(today) ? (
          <Button size="sm" variant="ghost" onClick={() => setMonth(monthKey(today))}>
            Mês atual
          </Button>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniStat
          label="Total no mês"
          value={formatBRL(total)}
          hint={
            change === null
              ? 'Sem despesas no mês anterior'
              : `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatPercent(Math.abs(change))} vs ${formatMonthKey(prevMonth)}`
          }
        />
        <MiniStat
          label="Lançamentos"
          value={String(items.length)}
          hint={byCategory[0] ? `Maior: ${EXPENSE_CATEGORY_LABEL[byCategory[0].key]}` : undefined}
        />
        <div className="col-span-2 lg:col-span-1">
          <MiniStat
            label="Recorrentes por mês"
            value={formatBRL(recurringMonthly)}
            hint={`${rules.filter((r) => r.active).length} ativas`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section
          title="Lançamentos"
          className="lg:col-span-2"
          description={`${formatDate(range.start, 'short')} a ${formatDate(range.end, 'short')}`}
        >
          {items.length === 0 ? (
            <EmptyState
              compact
              icon={<Receipt />}
              title="Nenhuma despesa neste mês"
              action={
                <Button size="sm" onClick={() => form.show(null)}>
                  Adicionar despesa
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line" aria-label="Despesas do mês">
              <AnimatePresence initial={false}>
                {items.map((e) => {
                  const { day } = parseISODate(e.date)
                  return (
                    <motion.li
                      key={e.id}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        type="button"
                        onClick={() => form.show(e)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/60"
                        aria-label={`Editar ${e.description}`}
                      >
                        <span className="tnum grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-[13px] font-semibold text-ink-2">
                          {String(day).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-ink">{e.description}</span>
                            {e.recurringId ? <Repeat className="size-3.5 shrink-0 text-ink-3" aria-label="Recorrente" /> : null}
                          </span>
                          <span className="block truncate text-[12.5px] text-ink-3">{EXPENSE_CATEGORY_LABEL[e.category]}</span>
                        </span>
                        <span className="tnum text-sm font-semibold text-ink">{formatBRL(e.amountCents)}</span>
                      </button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </Section>

        <ChartCard
          title="Por categoria"
          subtitle={formatMonthKey(month, 'long')}
          table={{
            caption: 'Despesas por categoria',
            columns: [
              { key: 'cat', label: 'Categoria' },
              { key: 'value', label: 'Valor', align: 'right' },
              { key: 'share', label: '%', align: 'right' },
            ],
            rows: byCategory.map((c) => ({
              id: c.key,
              cat: EXPENSE_CATEGORY_LABEL[c.key],
              value: formatBRL(c.cents),
              share: formatPercent(c.share),
            })),
          }}
        >
          {byCategory.length === 0 ? (
            <EmptyState compact icon={<PieChart />} title="Sem despesas no mês" />
          ) : (
            <HBarList
              ariaLabel="Despesas por categoria"
              color="var(--series-2)"
              formatValue={(v) => formatBRL(v)}
              items={byCategory.map((c) => ({
                key: c.key,
                label: EXPENSE_CATEGORY_LABEL[c.key],
                value: c.cents,
                share: c.share,
              }))}
            />
          )}
        </ChartCard>
      </div>

      <Section
        className="mt-4"
        title="Despesas recorrentes"
        description="Lançadas automaticamente todo mês. Para criar, marque “Repetir todo mês” ao registrar uma despesa."
      >
        {rules.length === 0 ? (
          <EmptyState
            compact
            icon={<Repeat />}
            title="Nenhuma despesa recorrente"
            description="Aluguel, assinaturas e salários são bons candidatos."
          />
        ) : (
          <ul className="divide-y divide-line" aria-label="Despesas recorrentes">
            {rules.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => recurringDialog.show(r)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/60"
                  aria-label={`Gerenciar ${r.description}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3">
                    <Repeat className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{r.description}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      {EXPENSE_CATEGORY_LABEL[r.category]} · todo dia {parseISODate(r.startDate).day}
                      {r.endDate ? ` · até ${formatDate(r.endDate)}` : ''}
                    </span>
                  </span>
                  <Badge tone={r.active ? 'good' : 'neutral'}>{r.active ? 'Ativa' : 'Pausada'}</Badge>
                  <span className="tnum w-28 text-right text-sm font-semibold text-ink">{formatBRL(r.amountCents)}/mês</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ExpenseForm open={form.open} expense={form.item} onClose={form.close} />
      <RecurringForm rule={recurringDialog.open ? recurringDialog.item : null} onClose={recurringDialog.close} />
    </>
  )
}
