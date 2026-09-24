import { useCallback, useMemo } from 'react'
import { useData } from '@/app/useData'
import { useToast } from '@/components/ui/useToast'
import { DomainError } from '@/db/repo'
import { indexDataset } from '@/domain/metrics'

export function useIndex() {
  const { ds } = useData()
  return useMemo(() => indexDataset(ds), [ds])
}

export function useClientName() {
  const index = useIndex()
  return useCallback((id: string | null | undefined) => (id ? (index.clients.get(id)?.name ?? 'Cliente removido') : '—'), [index])
}

/** Executa uma ação do repositório com feedback por toast; retorna true se deu certo. */
export function useAction() {
  const toast = useToast()
  return useCallback(
    async (
      fn: () => Promise<unknown>,
      success?: string | { title: string; description?: string; action?: { label: string; onClick: () => void } },
    ) => {
      try {
        await fn()
        if (success) toast(typeof success === 'string' ? { title: success } : success)
        return true
      } catch (err) {
        toast({
          tone: 'error',
          title: err instanceof DomainError ? err.message : 'Não foi possível concluir a ação',
          description: err instanceof DomainError ? undefined : 'Tente novamente. Seus dados não foram alterados.',
        })
        return false
      }
    },
    [toast],
  )
}

/** Normaliza texto para busca (sem acentos, minúsculo). */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matches(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = normalize(query)
  if (!q) return true
  return fields.some((f) => f && normalize(f).includes(q))
}
