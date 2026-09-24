import { CalendarRange, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { inputBase } from '@/components/ui/fieldStyles'
import { Popover } from '@/components/ui/Popover'
import { PERIOD_PRESETS, PERIOD_PRESET_LABEL, type Period, type PeriodPreset } from '@/domain/period'
import { cn } from '@/lib/cn'

export function PeriodFilter({
  period,
  onChange,
}: {
  period: Period
  onChange: (preset: PeriodPreset, custom?: { start: string; end: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(period.start)
  const [end, setEnd] = useState(period.end)
  const presets = PERIOD_PRESETS.filter((p) => p !== 'custom')
  const validCustom = start !== '' && end !== ''

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      label="Selecionar período"
      trigger={
        <Button
          variant="secondary"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setStart(period.start)
            setEnd(period.end)
            setOpen((v) => !v)
          }}
          icon={<CalendarRange className="size-4 text-ink-3" />}
        >
          <span className="max-w-[180px] truncate">{period.label}</span>
          <ChevronDown className={cn('size-4 text-ink-3 transition-transform', open && 'rotate-180')} />
        </Button>
      }
    >
      <ul className="flex flex-col">
        {presets.map((p) => {
          const selected = period.preset === p
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => {
                  onChange(p)
                  setOpen(false)
                }}
                className={cn(
                  'flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-surface-2',
                  selected ? 'font-semibold text-ink' : 'text-ink-2',
                )}
                aria-current={selected ? 'true' : undefined}
              >
                {PERIOD_PRESET_LABEL[p]}
                {selected ? <Check className="size-4" strokeWidth={2.6} /> : null}
              </button>
            </li>
          )
        })}
      </ul>
      <form
        className="mt-1.5 flex flex-col gap-2 border-t border-line px-1 pt-3 pb-1"
        onSubmit={(e) => {
          e.preventDefault()
          if (!validCustom) return
          onChange('custom', { start, end })
          setOpen(false)
        }}
      >
        <p className={cn('px-1.5 text-[12px] font-medium', period.preset === 'custom' ? 'text-ink' : 'text-ink-3')}>
          Personalizado
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            aria-label="Data inicial"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={cn(inputBase, 'tnum h-9 px-2')}
          />
          <input
            type="date"
            aria-label="Data final"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={cn(inputBase, 'tnum h-9 px-2')}
          />
        </div>
        <Button type="submit" size="sm" variant="primary" disabled={!validCustom}>
          Aplicar intervalo
        </Button>
      </form>
    </Popover>
  )
}
