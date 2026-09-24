import { useState } from 'react'

/**
 * Mantém o último valor não nulo — útil para que um diálogo continue mostrando
 * seu conteúdo durante a animação de saída.
 */
export function useRetained<T>(value: T | null | undefined): T | null {
  const [last, setLast] = useState<T | null>(value ?? null)
  if (value != null && value !== last) setLast(value)
  return value ?? last
}
