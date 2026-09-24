import { createContext, useContext, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

export const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm fora do ConfirmProvider')
  return ctx
}
