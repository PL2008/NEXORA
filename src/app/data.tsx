import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, type ReactNode } from 'react'
import { db } from '@/db/db'
import { loadDataset } from '@/db/repo'
import { syncRecurring } from '@/db/sync'
import { useToday } from '@/hooks/useToday'
import { DataContext } from './useData'

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const today = useToday()
  const ds = useLiveQuery(() => loadDataset(db), [])

  // Gera cobranças de contratos e despesas recorrentes pendentes (idempotente).
  useEffect(() => {
    // Em caso de falha, a próxima abertura tenta de novo; nada é perdido.
    syncRecurring(db, today).catch(() => undefined)
  }, [today])

  if (!ds) return <>{fallback}</>
  return <DataContext.Provider value={{ ds, today }}>{children}</DataContext.Provider>
}
