import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2 ring-line',
  accent: 'bg-accent-soft text-accent-ink ring-accent/15',
  good: 'bg-good-soft text-good ring-good/15',
  warn: 'bg-warn-soft text-warn ring-warn/15',
  bad: 'bg-bad-soft text-bad ring-bad/15',
}

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: BadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
