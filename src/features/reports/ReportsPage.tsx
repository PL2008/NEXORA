import { Download, FileSpreadsheet, PieChart, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useData } from '@/app/useData'
import { ChartCard } from '@/components/charts/ChartCard'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { HBarList } from '@/components/charts/HBarList'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { NativeSelect } from '@/components/ui/fields'
import { PageHeader } from '@/components/ui/PageHeader'
import { annualSummaryCsv, clientsCsv, contractsCsv, expensesCsv, receivablesCsv, salesCsv } from '@/domain/exports'
import { EXPENSE_CATEGORY_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { annualReport, yearsWithData } from '@/domain/metrics'
import { downloadFile } from '@/lib/csv'
import { cn } from '@/lib/cn'
import { formatMonthKey } from '@/lib/dates'
import { formatBRL, formatCompactBRL, formatInteger, formatPercent } from '@/lib/money'
import { MiniStat, Section } from '../shared'
import { useToast } from '@/components/ui/useToast'

export function ReportsPage() {
  const { ds, today } = useData()
  const toast = useToast()
  const years = useMemo(() => yearsWithData(ds, today), [ds, today])
  const [year, setYear] = useState(years[0] ?? Number(today.slice(0, 4)))
  const r = useMemo(() => annualReport(ds, year, today), [ds, year, today])
  const labels = r.months.map((m) => formatMonthKey(m.month).split(' ')[0] ?? '')
  const longLabels = r.months.map((m) => formatMonthKey(m.month, 'long'))
  const t = r.totals
  const empty = t.revenueCents === 0 && t.expensesCents === 0 && t.salesCount === 0

  const exportCsv = (name: string, content: string) => {
    downloadFile(`nexora-${name}.csv`, content, 'text/csv;charset=utf-8')
    toast({ title: 'Arquivo exportado', description: `nexora-${name}.csv` })
  }

  const exports = [
    { key: 'resumo', label: `Resumo mensal ${year}`, run: () => exportCsv(`resumo-${year}`, annualSummaryCsv(ds, year, today)) },
    { key: 'vendas', label: `Vendas ${year}`, run: () => exportCsv(`vendas-${year}`, salesCsv(ds, year, today)) },
    {
      key: 'recebimentos',
      label: `Recebimentos ${year}`,
      run: () => exportCsv(`recebimentos-${year}`, receivablesCsv(ds, year, today)),
    },
    { key: 'despesas', label: `Despesas ${year}`, run: () => exportCsv(`despesas-${year}`, expensesCsv(ds, year)) },
    { key: 'clientes', label: 'Clientes (todos)', run: () => exportCsv('clientes', clientsCsv(ds, today)) },
    { key: 'contratos', label: 'Contratos (todos)', run: () => exportCsv('contratos', contractsCsv(ds)) },
  ]

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Resultado anual mês a mês e exportação para planilhas"
        actions={
          <NativeSelect
            aria-label="Ano do relatório"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            size="md"
            className="w-32"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="Receita recebida" value={formatBRL(t.revenueCents)} />
        <MiniStat label="Despesas" value={formatBRL(t.expensesCents)} hint="Inclui custos de projetos" />
        <MiniStat
          label="Lucro"
          value={formatBRL(t.profitCents)}
          hint={t.margin !== null ? `Margem ${formatPercent(t.margin)}` : undefined}
          tone={t.profitCents < 0 ? 'bad' : undefined}
        />
        <MiniStat label="Vendas" value={formatInteger(t.salesCount)} hint={formatBRL(t.salesValueCents)} />
        <MiniStat label="Ticket médio" value={formatBRL(t.averageTicketCents)} />
        <MiniStat label="Novos clientes" value={formatInteger(r.newClients)} hint="Pelo 1º negócio fechado" />
      </div>

      {empty ? (
        <div className="mb-4 rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={<Sparkles />}
            title={`Nenhum lançamento em ${year}`}
            description="Vendas, recebimentos e despesas do ano aparecem aqui automaticamente."
          />
        </div>
      ) : (
        <ChartCard
          className="mb-4"
          title="Receita e despesas por mês"
          subtitle={`${year} · despesas incluem custos de projetos`}
          table={{
            caption: `Receita e despesas por mês em ${year}`,
            columns: [
              { key: 'm', label: 'Mês' },
              { key: 'rev', label: 'Receita', align: 'right' },
              { key: 'exp', label: 'Despesas', align: 'right' },
              { key: 'profit', label: 'Lucro', align: 'right' },
            ],
            rows: r.months.map((m, i) => ({
              id: m.month,
              m: longLabels[i],
              rev: formatBRL(m.revenueCents),
              exp: formatBRL(m.expensesCents),
              profit: formatBRL(m.profitCents),
            })),
          }}
        >
          <ColumnChart
            ariaLabel={`Receita e despesas por mês em ${year}`}
            labels={labels}
            tooltipLabels={longLabels}
            formatAxis={formatCompactBRL}
            formatValue={(v) => formatBRL(v)}
            series={[
              { key: 'rev', label: 'Receita', color: 'var(--series-1)', values: r.months.map((m) => m.revenueCents) },
              { key: 'exp', label: 'Despesas', color: 'var(--series-2)', values: r.months.map((m) => m.expensesCents) },
            ]}
          />
        </ChartCard>
      )}

      {empty ? null : (
        <>
          <Section title={`Mês a mês — ${year}`} className="mb-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Resultado mensal de {year}</caption>
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-3">
                    <th scope="col" className="px-5 py-2.5 text-left font-medium">
                      Mês
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Receita
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Despesas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Custos de projetos
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Lucro
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Vendas
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Novos clientes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.months.map((m, i) => (
                    <tr key={m.month} className="border-b border-line">
                      <th scope="row" className="px-5 py-2.5 text-left font-normal text-ink-2 capitalize">
                        {longLabels[i]?.replace(/ de \d+$/, '')}
                      </th>
                      <td className="tnum px-3 py-2.5 text-right text-ink">{formatBRL(m.revenueCents)}</td>
                      <td className="tnum px-3 py-2.5 text-right text-ink-2">{formatBRL(m.operatingExpensesCents)}</td>
                      <td className="tnum px-3 py-2.5 text-right text-ink-2">{formatBRL(m.projectCostsCents)}</td>
                      <td className={cn('tnum px-3 py-2.5 text-right font-medium', m.profitCents < 0 ? 'text-bad' : 'text-ink')}>
                        {formatBRL(m.profitCents)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-ink-2">{m.salesCount}</td>
                      <td className="tnum px-5 py-2.5 text-right text-ink-2">{r.newClientsByMonth[i] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-2/60 font-semibold">
                    <th scope="row" className="px-5 py-3 text-left text-ink">
                      Total
                    </th>
                    <td className="tnum px-3 py-3 text-right text-ink">{formatBRL(t.revenueCents)}</td>
                    <td className="tnum px-3 py-3 text-right text-ink">{formatBRL(t.operatingExpensesCents)}</td>
                    <td className="tnum px-3 py-3 text-right text-ink">{formatBRL(t.projectCostsCents)}</td>
                    <td className={cn('tnum px-3 py-3 text-right', t.profitCents < 0 ? 'text-bad' : 'text-ink')}>
                      {formatBRL(t.profitCents)}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink">{t.salesCount}</td>
                    <td className="tnum px-5 py-3 text-right text-ink">{r.newClients}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Receita por tipo de serviço"
              subtitle={String(year)}
              table={{
                caption: 'Receita por tipo de serviço',
                columns: [
                  { key: 'k', label: 'Serviço' },
                  { key: 'v', label: 'Receita', align: 'right' },
                  { key: 's', label: '%', align: 'right' },
                ],
                rows: r.byService.map((x) => ({
                  id: x.key,
                  k: SERVICE_TYPE_LABEL[x.key],
                  v: formatBRL(x.cents),
                  s: formatPercent(x.share),
                })),
              }}
            >
              {r.byService.length === 0 ? (
                <EmptyState compact icon={<PieChart />} title="Sem receita no ano" />
              ) : (
                <HBarList
                  ariaLabel="Receita por tipo de serviço"
                  formatValue={(v) => formatBRL(v)}
                  items={r.byService.map((x) => ({
                    key: x.key,
                    label: SERVICE_TYPE_LABEL[x.key],
                    value: x.cents,
                    share: x.share,
                  }))}
                />
              )}
            </ChartCard>
            <ChartCard
              title="Despesas por categoria"
              subtitle={`${year} · sem custos de projetos`}
              table={{
                caption: 'Despesas por categoria',
                columns: [
                  { key: 'k', label: 'Categoria' },
                  { key: 'v', label: 'Valor', align: 'right' },
                  { key: 's', label: '%', align: 'right' },
                ],
                rows: r.byCategory.map((x) => ({
                  id: x.key,
                  k: EXPENSE_CATEGORY_LABEL[x.key],
                  v: formatBRL(x.cents),
                  s: formatPercent(x.share),
                })),
              }}
            >
              {r.byCategory.length === 0 ? (
                <EmptyState compact icon={<PieChart />} title="Sem despesas no ano" />
              ) : (
                <HBarList
                  ariaLabel="Despesas por categoria"
                  color="var(--series-2)"
                  formatValue={(v) => formatBRL(v)}
                  items={r.byCategory.map((x) => ({
                    key: x.key,
                    label: EXPENSE_CATEGORY_LABEL[x.key],
                    value: x.cents,
                    share: x.share,
                  }))}
                />
              )}
            </ChartCard>
          </div>
        </>
      )}

      <Section
        title="Exportar CSV"
        description="Arquivos com separador “;” e vírgula decimal — abrem direto no Excel e no Google Planilhas."
      >
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {exports.map((x) => (
            <Button key={x.key} variant="secondary" icon={<FileSpreadsheet className="size-4 text-ink-3" />} onClick={x.run}>
              <span className="flex-1 text-left">{x.label}</span>
              <Download className="size-4 text-ink-3" />
            </Button>
          ))}
        </div>
      </Section>
    </>
  )
}
