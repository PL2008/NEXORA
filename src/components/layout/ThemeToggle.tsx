import { Moon, Sun } from 'lucide-react'
import { useData } from '@/app/useData'
import { repo } from '@/db/repo'
import { Button } from '@/components/ui/Button'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Alterna rapidamente entre claro e escuro (a opção "sistema" fica nas configurações). */
export function ThemeToggle() {
  const { ds } = useData()
  const pref = ds.settings.theme
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = pref === 'dark' || (pref === 'system' && systemDark)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      onClick={() => void repo.setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
    </Button>
  )
}
