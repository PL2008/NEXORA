import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { formatPercent } from '@/lib/money'

export interface HBarItem {
  key: string
  label: ReactNode
  value: number
  share?: number
  hint?: ReactNode
}

/**
 * Barras horizontais com rótulo e valor diretos. Uma única série → uma única cor.
 * A barra é SVG, com fim arredondado (4px) e base reta.
 */
export function HBarList({
  items,
  formatValue,
  color = 'var(--series-1)',
  ariaLabel,
}: {
  items: HBarItem[]
  formatValue: (v: number) => string
  color?: string
  ariaLabel: string
}) {
  const max = Math.max(0, ...items.map((i) => i.value))
  return (
    <ul className="flex flex-col gap-1" aria-label={ariaLabel}>
      {items.map((item, idx) => {
        const ratio = max > 0 ? item.value / max : 0
        return (
          <li
            key={item.key}
            className="group rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
            title={item.share !== undefined ? `${formatValue(item.value)} · ${formatPercent(item.share)} do total` : undefined}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink-2 group-hover:text-ink">{item.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {item.share !== undefined ? (
                  <span className="tnum text-[11.5px] text-ink-3">{formatPercent(item.share)}</span>
                ) : null}
                <span className="tnum font-medium text-ink">{formatValue(item.value)}</span>
              </span>
            </div>
            <svg width="100%" height="8" className="block overflow-visible" aria-hidden preserveAspectRatio="none">
              <rect
                x="0"
                y="0"
                width="100%"
                height="8"
                rx="4"
                fill="var(--surface-2)"
                className="group-hover:fill-[var(--surface-3)]"
              />
              <motion.rect
                x="0"
                y="0"
                height="8"
                rx="4"
                fill={color}
                initial={{ width: '0%' }}
                animate={{ width: `${Math.max(ratio * 100, item.value > 0 ? 1.5 : 0)}%` }}
                transition={{ duration: 0.7, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            {item.hint ? <div className="mt-1 text-[12px] text-ink-3">{item.hint}</div> : null}
          </li>
        )
      })}
    </ul>
  )
}
