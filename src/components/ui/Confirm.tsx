import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmOptions } from './useConfirm'
import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false)
    setState({ ...options, open: true })
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setState((s) => (s ? { ...s, open: false } : s))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state?.open}
        onClose={() => close(false)}
        title={state?.title ?? ''}
        description={state?.description}
        size="sm"
        role="alertdialog"
        initialFocus="[data-confirm]"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button data-confirm variant={state?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  )
}
