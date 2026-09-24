import { cn } from '@/lib/cn'

/** Moldura dos campos (borda, fundo, foco, erro), sem tamanho de texto. */
export const inputFrame = cn(
  'w-full rounded-lg border border-line-strong bg-surface text-ink placeholder:text-ink-3',
  'transition-[border-color,box-shadow] duration-150 outline-none',
  'focus:border-accent focus:ring-[3px] focus:ring-accent/20',
  'aria-[invalid=true]:border-bad aria-[invalid=true]:focus:ring-bad/15',
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
)

/** 16px no celular evita o zoom automático do iOS ao focar. */
export const inputBase = cn(inputFrame, 'text-base sm:text-sm')
