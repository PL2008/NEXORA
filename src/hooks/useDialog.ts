import { useCallback, useState } from 'react'

/**
 * Estado de um diálogo com item associado. Ao fechar, o item é mantido para que o
 * conteúdo não mude durante a animação de saída.
 */
export function useDialog<T>() {
  const [state, setState] = useState<{ open: boolean; item: T | null }>({ open: false, item: null })
  const show = useCallback((item: T | null = null) => setState({ open: true, item }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  return { open: state.open, item: state.item, show, close }
}
