import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsSmUp } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { Button } from './Button'

// Pilha de diálogos abertos: Esc e o foco valem só para o do topo.
const stack: string[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let lockCount = 0
function lockScroll() {
  if (lockCount++ === 0) {
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.documentElement.style.overflow = 'hidden'
    if (sw > 0) document.documentElement.style.paddingRight = `${sw}px`
  }
}
function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0
    document.documentElement.style.overflow = ''
    document.documentElement.style.paddingRight = ''
  }
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Elemento que recebe o foco ao abrir: seletor CSS dentro do diálogo, ou "panel" para o próprio diálogo. */
  initialFocus?: string
  role?: 'dialog' | 'alertdialog'
}

const widths = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[720px]', xl: 'sm:max-w-[880px]' }

export function Modal(props: ModalProps) {
  return createPortal(
    <AnimatePresence>{props.open ? <ModalPanel key="modal" {...props} /> : null}</AnimatePresence>,
    document.body,
  )
}

function ModalPanel({ onClose, title, description, children, footer, size = 'md', initialFocus, role = 'dialog' }: ModalProps) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const smUp = useIsSmUp()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    stack.push(id)
    lockScroll()
    const panel = panelRef.current
    const target =
      (initialFocus === 'panel' ? panel : initialFocus ? panel?.querySelector<HTMLElement>(initialFocus) : null) ??
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), select, textarea') ??
      panel
    target?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]!
        const last = items[items.length - 1]!
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)
      unlockScroll()
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true })
    }
    // Executa apenas ao montar/desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px] dark:bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onCloseRef.current()}
        aria-hidden
      />
      <motion.div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-pop outline-none',
          'rounded-t-[22px] border-t border-line sm:rounded-2xl sm:border',
          widths[size],
        )}
        initial={smUp ? { opacity: 0, scale: 0.97, y: 8 } : { y: '100%' }}
        animate={smUp ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={smUp ? { opacity: 0, scale: 0.98, y: 4 } : { y: '100%' }}
        transition={smUp ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] } : { type: 'spring', damping: 34, stiffness: 380 }}
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
              {title}
            </h2>
            {description ? (
              <p id={`${id}-desc`} className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => onCloseRef.current()} className="-mt-1 -mr-2">
            <X className="size-[18px]" />
          </Button>
        </header>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div> : null}
        {footer ? (
          <footer className="pb-safe flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {footer}
          </footer>
        ) : null}
      </motion.div>
    </div>
  )
}
