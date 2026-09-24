import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} {...props} />
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
  id,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
  id?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-4', className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  )
}
