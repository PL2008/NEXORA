import { motion } from 'motion/react'

/** Medidor horizontal: trilho em tom claro da mesma rampa; verde ao atingir 100%. */
export function Meter({ ratio, label, height = 10 }: { ratio: number; label: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  const done = ratio >= 1
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="w-full"
    >
      <svg width="100%" height={height} className="block" aria-hidden>
        <rect x="0" y="0" width="100%" height={height} rx={height / 2} fill={done ? 'var(--good-soft)' : 'var(--meter-track)'} />
        <motion.rect
          x="0"
          y="0"
          height={height}
          rx={height / 2}
          fill={done ? 'var(--good)' : 'var(--accent)'}
          initial={{ width: '0%' }}
          animate={{ width: `${pct > 0 ? Math.max(pct, 2) : 0}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </div>
  )
}
