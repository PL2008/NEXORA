import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Sparkline } from '@/components/charts/Sparkline'
import { cn } from '@/lib/cn'
import { formatPercent, relativeChange } from '@/lib/money'

export function Delta({
  current,
  previous,
  upIsGood = true,
  label,
}: {
  current: number
  previous: number
  upIsGood?: boolean
  label: string
}) {
  const change = relativeChange(current, previous)
  if (change === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-ink-3" title={label}>
        <Minus className="size-3.5" aria-hidden /> sem base de comparação
      </span>
    )
  }
  const flat = Math.abs(change) < 0.0005
  const up = change > 0
  const good = flat ? null : up === upIsGood
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-[12px]">
      <span
        className={cn(
          'tnum inline-flex shrink-0 items-center gap-0.5 font-semibold',
          good === null ? 'text-ink-3' : good ? 'text-good' : 'text-bad',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {flat ? '0%' : `${up ? '+' : '−'}${formatPercent(Math.abs(change))}`}
      </span>
      <span className="min-w-0 text-ink-3">{label}</span>
    </span>
  )
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  trend,
  hero,
  index = 0,
  className,
  children,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: ReactNode
  trend?: { values: number[]; label: string }
  hero?: boolean
  index?: number
  className?: string
  children?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        '@container flex min-w-0 flex-col rounded-2xl border border-line bg-surface px-4 pt-4 pb-3.5 shadow-card sm:px-5',
        className,
      )}
      role="group"
      aria-label={label}
    >
      <p className="truncate text-[13px] text-ink-3">{label}</p>
      <p
        className="mt-1.5 truncate leading-tight font-semibold tracking-[-0.025em] text-ink"
        // Tamanho fluido pela largura do cartão (container query): cabe no celular sem cortar.
        style={{ fontSize: hero ? 'clamp(22px, 11cqi, 30px)' : 'clamp(17px, 12.5cqi, 24px)' }}
      >
        {value}
      </p>
      {delta ? <div className="mt-1 min-w-0">{delta}</div> : null}
      {sub ? <div className="mt-1 line-clamp-2 min-w-0 text-[12.5px] text-ink-3">{sub}</div> : null}
      {children}
      {trend ? (
        <div className="mt-auto pt-3">
          <Sparkline values={trend.values} label={trend.label} />
        </div>
      ) : null}
    </motion.div>
  )
}
