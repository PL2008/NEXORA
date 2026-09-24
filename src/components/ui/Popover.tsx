import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Popover ancorado ao gatilho; fecha com Esc ou clique fora. */
export function Popover({
  open,
  onClose,
  trigger,
  children,
  align = 'end',
  className,
  label,
}: {
  open: boolean
  onClose: () => void
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        ref.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger}
      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute top-[calc(100%+6px)] z-40 w-[min(300px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-1.5 shadow-pop',
              align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              className,
            )}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
