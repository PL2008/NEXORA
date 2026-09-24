import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastInput {
  title: string
  description?: string | undefined
  tone?: ToastTone
  action?: { label: string; onClick: () => void } | undefined
  duration?: number
}

export const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
