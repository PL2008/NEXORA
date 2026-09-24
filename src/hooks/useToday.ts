import { useEffect, useState } from 'react'
import { todayISO } from '@/lib/dates'

/** Data de hoje (local), atualizada na virada do dia e ao voltar para a aba. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const check = () =>
      setToday((prev) => {
        const now = todayISO()
        return now === prev ? prev : now
      })
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}
