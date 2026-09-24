import { createContext, useContext } from 'react'
import type { Dataset } from '@/domain/types'

export interface DataValue {
  ds: Dataset
  today: string
}

export const DataContext = createContext<DataValue | null>(null)

export function useData(): DataValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}
