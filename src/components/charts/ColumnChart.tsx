import { motion } from 'motion/react'
import { useState, type KeyboardEvent } from 'react'
import { useElementWidth } from '@/hooks/useElementSize'
import { cn } from '@/lib/cn'
import { niceScale } from './scale'
import { ChartTooltip, TooltipRow } from './Tooltip'

export interface ColumnSeries {
  key: string
  label: string
  color: string
  values: number[]
}

const M = { top: 12, right: 8, bottom: 28 }

/** Colunas agrupadas (≤ 24px), topo arredondado 4px, base reta, 2px de respiro entre barras vizinhas. */
export function ColumnChart({
  labels,
  tooltipLabels,
  series,
  height = 260,
  formatValue,
  formatAxis,
  ariaLabel,
}: {
  labels: string[]
  tooltipLabels?: string[]
  series: ColumnSeries[]
  height?: number
  formatValue: (v: number) => string
  formatAxis: (v: number) => string
  ariaLabel: string
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const n = labels.length
  const all = series.flatMap((s) => s.values)
  const scale = niceScale(Math.min(0, ...all), Math.max(0, ...all), 4)
  const left = Math.max(40, Math.max(...scale.ticks.map((t) => formatAxis(t).length)) * 6.4 + 12)
  const innerW = Math.max(0, width - left - M.right)
  const innerH = height - M.top - M.bottom
  const band = n > 0 ? innerW / n : 0
  const gap = 2
  const barW = Math.max(2, Math.min(24, (band * 0.72 - gap * (series.length - 1)) / Math.max(1, series.length)))
  const groupW = barW * series.length + gap * (series.length - 1)
  const y = (v: number) => M.top + innerH - ((v - scale.min) / (scale.max - scale.min || 1)) * innerH
  const zeroY = y(0)
  const isEmpty = all.every((v) => v === 0)
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 40))))

  const barPath = (bx: number, v: number) => {
    const top = y(v)
    const h = Math.abs(zeroY - top)
    if (h < 0.5) return ''
    const r = Math.min(4, barW / 2, h)
    if (v >= 0) {
      return `M${bx},${zeroY}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + barW - r}Q${bx + barW},${top} ${bx + barW},${top + r}V${zeroY}Z`
    }
    return `M${bx},${zeroY}V${top - r}Q${bx},${top} ${bx + r},${top}H${bx + barW - r}Q${bx + barW},${top} ${bx + barW},${top - r}V${zeroY}Z`
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setActive((cur) => Math.min(n - 1, Math.max(0, (cur ?? -1) + (e.key === 'ArrowRight' ? 1 : -1))))
    } else if (e.key === 'Escape') setActive(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {series.length > 1 ? (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-2" aria-label="Legenda">
          {series.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div
        ref={ref}
        className="relative outline-none select-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-accent/40"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-roledescription="gráfico de colunas"
        aria-label={`${ariaLabel}. Use as setas para navegar.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setActive(null)
        }}
      >
        {width > 0 ? (
          <svg width={width} height={height} className="block" aria-hidden>
            {scale.ticks.map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={left + innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
                  shapeRendering="crispEdges"
                />
                <text x={left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-[var(--chart-label)] text-[11px]">
                  {formatAxis(t)}
                </text>
              </g>
            ))}
            {labels.map((l, i) => {
              const cx = left + band * i + band / 2
              return (
                <g key={`${l}-${i}`}>
                  {active === i ? (
                    <rect x={left + band * i} y={M.top} width={band} height={innerH} rx={6} fill="var(--surface-2)" />
                  ) : null}
                  {series.map((s, si) => {
                    const bx = cx - groupW / 2 + si * (barW + gap)
                    const d = barPath(bx, s.values[i] ?? 0)
                    return d ? (
                      <motion.path
                        key={s.key}
                        d={d}
                        fill={s.color}
                        style={{ transformOrigin: `${bx + barW / 2}px ${zeroY}px` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.55, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null
                  })}
                  {i % labelEvery === 0 ? (
                    <text
                      x={cx}
                      y={height - 8}
                      textAnchor="middle"
                      className={cn('text-[11px]', active === i ? 'fill-[var(--ink)] font-medium' : 'fill-[var(--chart-label)]')}
                    >
                      {l}
                    </text>
                  ) : null}
                  <rect
                    x={left + band * i}
                    y={M.top}
                    width={band}
                    height={innerH + M.bottom}
                    fill="transparent"
                    style={{ touchAction: 'pan-y' }}
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                  />
                </g>
              )
            })}
          </svg>
        ) : null}
        {isEmpty && width > 0 ? (
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center pb-6 text-[13px] text-ink-3"
            style={{ paddingLeft: left }}
          >
            Sem movimentação no período
          </div>
        ) : null}
        {active !== null && width > 0 ? (
          <ChartTooltip
            x={left + band * active + band / 2 + (active < n / 2 ? groupW / 2 : -groupW / 2)}
            y={M.top}
            containerWidth={width}
            title={(tooltipLabels ?? labels)[active] ?? ''}
          >
            {series.map((s) => (
              <TooltipRow key={s.key} swatch="box" color={s.color} label={s.label} value={formatValue(s.values[active] ?? 0)} />
            ))}
          </ChartTooltip>
        ) : null}
      </div>
    </div>
  )
}
