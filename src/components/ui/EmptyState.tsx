import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}
    >
      <div
        className={cn(
          'relative mb-4 grid place-items-center rounded-2xl border border-line bg-surface-2 text-ink-2',
          compact ? 'size-10 [&_svg]:size-[18px]' : 'size-12 [&_svg]:size-5',
        )}
      >
        {icon}
      </div>
      <p className={cn('font-semibold tracking-[-0.01em] text-ink', compact ? 'text-sm' : 'text-[15px]')}>{title}</p>
      {description ? (
        <p className={cn('mt-1 max-w-[340px] text-ink-3', compact ? 'text-[12.5px]' : 'text-[13.5px] leading-relaxed')}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </motion.div>
  )
}
