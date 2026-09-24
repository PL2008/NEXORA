import { motion } from 'motion/react'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementWidth } from '@/hooks/useElementSize'
import { cn } from '@/lib/cn'
import { niceScale } from './scale'
import { ChartTooltip, TooltipRow } from './Tooltip'

export interface LineSeries {
  key: string
  label: string
  /** Cor da série (variável CSS). */
  color: string
  values: number[]
  area?: boolean
}

export interface LineChartProps {
  labels: string[]
  tooltipLabels?: string[]
  series: LineSeries[]
  height?: number
  formatValue: (v: number) => string
  formatAxis: (v: number) => string
  ariaLabel: string
}

const M = { top: 12, right: 14, bottom: 28 }

export function LineChart({ labels, tooltipLabels, series, height = 260, formatValue, formatAxis, ariaLabel }: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const n = labels.length

  const all = series.flatMap((s) => s.values)
  const scale = niceScale(Math.min(0, ...all), Math.max(0, ...all), 4)
  const left = Math.max(40, Math.max(...scale.ticks.map((t) => formatAxis(t).length)) * 6.4 + 12)
  const innerW = Math.max(0, width - left - M.right)
  const innerH = height - M.top - M.bottom
  const inset = n > 1 ? Math.min(18, innerW / (n * 2)) : 0
  const x = (i: number) => left + (n <= 1 ? innerW / 2 : inset + (i / (n - 1)) * (innerW - inset * 2))
  const y = (v: number) => M.top + innerH - ((v - scale.min) / (scale.max - scale.min || 1)) * innerH
  const isEmpty = all.every((v) => v === 0)

  // Mostra no máximo um rótulo a cada ~44px.
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 44))))
  const showLabel = (i: number) => i === n - 1 || (i % labelEvery === 0 && n - 1 - i >= labelEvery)

  const linePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const areaPath = (values: number[]) =>
    `${linePath(values)}L${x(values.length - 1).toFixed(1)},${y(Math.max(0, scale.min)).toFixed(1)}L${x(0).toFixed(1)},${y(Math.max(0, scale.min)).toFixed(1)}Z`

  const indexFromPointer = (e: PointerEvent<SVGRectElement>) => {
    if (n <= 1) return 0
    const rect = e.currentTarget.getBoundingClientRect()
    const span = Math.max(1, rect.width - inset * 2)
    const ratio = (e.clientX - rect.left - inset) / span
    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setActive((cur) => {
        const base = cur ?? n - 1
        return Math.min(n - 1, Math.max(0, base + (e.key === 'ArrowRight' ? 1 : -1)))
      })
    } else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(n - 1)
    else if (e.key === 'Escape') setActive(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {series.length > 1 ? (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-2" aria-label="Legenda">
          {series.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-[2px] w-3.5 rounded-full" style={{ background: s.color }} />
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
        aria-roledescription="gráfico de linhas"
        aria-label={`${ariaLabel}. Use as setas para navegar pelos pontos.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
      >
        {width > 0 ? (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            {scale.ticks.map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={left + innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-[var(--chart-label)] text-[11px]">
                  {formatAxis(t)}
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              showLabel(i) ? (
                <text
                  key={`${l}-${i}`}
                  x={x(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className={cn('text-[11px]', active === i ? 'fill-[var(--ink)] font-medium' : 'fill-[var(--chart-label)]')}
                >
                  {l}
                </text>
              ) : null,
            )}
            {!isEmpty &&
              series.map((s) =>
                s.area ? (
                  <motion.path
                    key={`${s.key}-area`}
                    d={areaPath(s.values)}
                    fill={s.color}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                ) : null,
              )}
            {!isEmpty &&
              series.map((s) => (
                <motion.path
                  key={s.key}
                  d={linePath(s.values)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            {!isEmpty &&
              series.map((s) => {
                const last = s.values.length - 1
                if (last < 0 || active !== null) return null
                return (
                  <circle
                    key={`${s.key}-end`}
                    cx={x(last)}
                    cy={y(s.values[last] ?? 0)}
                    r={4}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                )
              })}
            {active !== null && !isEmpty ? (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={M.top}
                  y2={M.top + innerH}
                  stroke="var(--chart-axis)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(active)}
                    cy={y(s.values[active] ?? 0)}
                    r={4.5}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ) : null}
            <rect
              x={left}
              y={M.top}
              width={innerW}
              height={innerH + M.bottom}
              fill="transparent"
              style={{ touchAction: 'pan-y' }}
              onPointerMove={(e) => setActive(indexFromPointer(e))}
              onPointerDown={(e) => setActive(indexFromPointer(e))}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') setActive(null)
              }}
            />
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
        {active !== null && !isEmpty && width > 0 ? (
          <ChartTooltip x={x(active)} y={M.top} containerWidth={width} title={(tooltipLabels ?? labels)[active] ?? ''}>
            {series.map((s) => (
              <TooltipRow key={s.key} color={s.color} label={s.label} value={formatValue(s.values[active] ?? 0)} />
            ))}
          </ChartTooltip>
        ) : null}
      </div>
    </div>
  )
}
