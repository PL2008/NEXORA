import { useElementWidth } from '@/hooks/useElementSize'

/** Tendência de 12 pontos: linha discreta e ponto atual em destaque. */
export function Sparkline({ values, height = 32, label }: { values: number[]; height?: number; label: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const n = values.length
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const pad = 4
  const x = (i: number) => (n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2))
  const y = (v: number) => pad + (height - pad * 2) * (1 - (max === min ? 0.5 : (v - min) / (max - min)))
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const allZero = values.every((v) => v === 0)
  return (
    <div ref={ref} style={{ height }} className="w-full" role="img" aria-label={label}>
      {width > 0 && n > 0 ? (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden>
          <path
            d={d}
            fill="none"
            stroke={allZero ? 'var(--chart-axis)' : 'var(--ink-3)'}
            strokeOpacity={allZero ? 1 : 0.55}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {!allZero ? (
            <circle
              cx={x(n - 1)}
              cy={y(values[n - 1] ?? 0)}
              r={3.5}
              fill="var(--accent)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          ) : null}
        </svg>
      ) : null}
    </div>
  )
}
