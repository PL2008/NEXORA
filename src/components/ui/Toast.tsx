import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { ToastContext, type ToastInput, type ToastTone } from './useToast'

interface ToastItem extends ToastInput {
  id: number
}

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-[18px] text-good" aria-hidden />,
  error: <CircleAlert className="size-[18px] text-bad" aria-hidden />,
  info: <Info className="size-[18px] text-accent" aria-hidden />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      const id = ++seq.current
      setItems((list) => [...list.slice(-2), { ...input, id }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), input.duration ?? (input.action ? 6000 : 3800)),
      )
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
        >
          <AnimatePresence initial={false}>
            {items.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className={cn(
                  'pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-pop',
                )}
              >
                <span className="mt-px shrink-0">{icons[t.tone ?? 'success']}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  {t.description ? <p className="mt-0.5 text-[13px] text-ink-3">{t.description}</p> : null}
                </div>
                {t.action ? (
                  <button
                    type="button"
                    className="-my-1 shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-accent hover:bg-accent-soft"
                    onClick={() => {
                      t.action?.onClick()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Dispensar"
                  className="-my-0.5 -mr-1 shrink-0 rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
                  onClick={() => dismiss(t.id)}
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
