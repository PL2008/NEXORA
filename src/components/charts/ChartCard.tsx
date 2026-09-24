import { BarChart3, Table2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
}

export interface TableData {
  columns: TableColumn[]
  rows: Array<Record<string, ReactNode> & { id: string }>
  caption: string
}

/** Cartão de gráfico com alternância para visualização em tabela. */
export function ChartCard({
  title,
  subtitle,
  children,
  table,
  className,
  bodyClassName,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  table?: TableData
  className?: string
  bodyClassName?: string
  actions?: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  const titleId = useId()
  return (
    <Card className={cn('flex min-w-0 flex-col', className)} aria-labelledby={titleId} role="region">
      <CardHeader
        id={titleId}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {actions}
            {table ? (
              <button
                type="button"
                onClick={() => setAsTable((v) => !v)}
                aria-pressed={asTable}
                aria-label={asTable ? `Ver ${title} como gráfico` : `Ver ${title} como tabela`}
                title={asTable ? 'Ver como gráfico' : 'Ver como tabela'}
                className="grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink aria-pressed:bg-surface-2 aria-pressed:text-ink"
              >
                {asTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
              </button>
            ) : null}
          </>
        }
      />
      <div className={cn('min-w-0 flex-1 px-5 pt-4 pb-5', bodyClassName)}>
        <motion.div
          key={asTable ? 'table' : 'chart'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {asTable && table ? <DataTable {...table} /> : children}
        </motion.div>
      </div>
    </Card>
  )
}

export function DataTable({ columns, rows, caption }: TableData) {
  return (
    <div className="-mx-1 max-h-[340px] overflow-auto">
      <table className="w-full min-w-[320px] border-collapse text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'border-b border-line px-1 py-2 text-[11.5px] font-medium tracking-wide text-ink-3 uppercase',
                  c.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-1 py-6 text-center text-ink-3">
                Sem dados no período
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                {columns.map((c, i) => {
                  const Cell = i === 0 ? 'th' : 'td'
                  return (
                    <Cell
                      key={c.key}
                      scope={i === 0 ? 'row' : undefined}
                      className={cn(
                        'px-1 py-2 font-normal',
                        c.align === 'right' ? 'tnum text-right text-ink' : 'text-left text-ink-2',
                      )}
                    >
                      {r[c.key]}
                    </Cell>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
