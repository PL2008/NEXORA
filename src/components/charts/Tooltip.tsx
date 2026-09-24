import type { ReactNode } from 'react'

/** Tooltip HTML posicionado sobre o gráfico; vira para a esquerda na metade direita. */
export function ChartTooltip({
  x,
  y,
  containerWidth,
  title,
  children,
}: {
  x: number
  y: number
  containerWidth: number
  title: ReactNode
  children: ReactNode
}) {
  const flip = x > containerWidth / 2
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur-sm"
      style={{ left: x, top: y, transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
    >
      <p className="mb-1.5 text-[11.5px] font-medium text-ink-3">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

export function TooltipRow({
  color,
  label,
  value,
  swatch = 'line',
}: {
  color?: string
  label: ReactNode
  value: ReactNode
  swatch?: 'line' | 'box'
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {color ? (
        <span
          aria-hidden
          className={swatch === 'line' ? 'h-[2px] w-3 shrink-0 rounded-full' : 'size-2.5 shrink-0 rounded-[3px]'}
          style={{ background: color }}
        />
      ) : null}
      <span className="tnum text-[13px] font-semibold text-ink">{value}</span>
      <span className="text-[12px] text-ink-3">{label}</span>
    </div>
  )
}
