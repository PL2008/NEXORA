import { motion } from 'motion/react'
import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

/** Controle segmentado com indicador animado. Usa semântica de radiogroup. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
  stretch,
}: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<SegmentOption<T>>
  label: string
  size?: 'sm' | 'md'
  className?: string
  stretch?: boolean
}) {
  const layoutId = useId()
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]
    if (next) {
      onChange(next.value)
      const el = e.currentTarget.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)
      el?.focus()
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex max-w-full scrollbar-none items-center gap-0.5 overflow-x-auto rounded-[10px] bg-surface-2 p-[3px]',
        stretch && 'flex w-full',
        className,
      )}
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-value={o.value}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] font-medium transition-colors duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13px]',
              stretch && 'flex-1',
              selected ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[8px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--line)]"
                transition={{ type: 'spring', damping: 32, stiffness: 420 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined ? (
                <span className={cn('tnum text-[11.5px]', selected ? 'text-ink-2' : 'text-ink-3')}>{o.count}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
