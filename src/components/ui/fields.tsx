import { ChevronDown } from 'lucide-react'
import {
  useId,
  type ChangeEvent,
  type ClipboardEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'
import { formatDecimal, parseBRL } from '@/lib/money'
import { inputBase, inputFrame } from './fieldStyles'

interface FieldShellProps {
  id: string
  label: ReactNode
  error?: string | undefined
  hint?: ReactNode
  className?: string
  children: ReactNode
  optional?: boolean
}

export function FieldShell({ id, label, error, hint, className, children, optional }: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
        {optional ? <span className="font-normal text-ink-3"> · opcional</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

type BaseProps = { label: ReactNode; error?: string | undefined; hint?: ReactNode; className?: string; optional?: boolean }

export function TextField({
  label,
  error,
  hint,
  className,
  optional,
  onValueChange,
  ref,
  ...props
}: BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    onValueChange?: (v: string) => void
    ref?: Ref<HTMLInputElement>
  }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(inputBase, 'h-10 px-3')}
        onChange={(e) => onValueChange?.(e.target.value)}
        {...props}
      />
    </FieldShell>
  )
}

export function TextareaField({
  label,
  error,
  hint,
  className,
  optional,
  onValueChange,
  ...props
}: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & { onValueChange?: (v: string) => void }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(inputBase, 'min-h-[76px] resize-y px-3 py-2 leading-relaxed')}
        onChange={(e) => onValueChange?.(e.target.value)}
        {...props}
      />
    </FieldShell>
  )
}

const selectSizes = {
  sm: 'h-8 pl-2.5 pr-8 text-base sm:text-[13px]',
  md: 'h-9 pl-3 pr-9 text-base sm:text-sm',
  lg: 'h-10 pl-3 pr-9 text-base sm:text-sm',
}

/** Select nativo (melhor no celular). `className` vai no invólucro — use para largura. */
export function NativeSelect({
  className,
  children,
  size = 'lg',
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { className?: string; size?: keyof typeof selectSizes }) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select className={cn(inputFrame, 'cursor-pointer appearance-none', selectSizes[size])} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3',
          size === 'sm' ? 'right-2.5 size-3.5' : 'right-3 size-4',
        )}
      />
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  error,
  hint,
  className,
  optional,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  name,
}: BaseProps & {
  value: T | ''
  onValueChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
  placeholder?: string
  disabled?: boolean
  name?: string
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <NativeSelect
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(e) => onValueChange(e.target.value as T)}
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </FieldShell>
  )
}

/** Campo monetário com máscara de centavos (digitar 1 2 3 4 → 12,34). */
export function MoneyInput({
  value,
  onValueChange,
  className,
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'> & {
  value: number | null
  onValueChange: (cents: number | null) => void
  className?: string
}) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12)
    onValueChange(digits === '' ? null : Number(digits))
  }
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const parsed = parseBRL(e.clipboardData.getData('text'))
    if (parsed !== null) {
      e.preventDefault()
      onValueChange(parsed === 0 ? null : parsed)
    }
  }
  return (
    <div className={cn('relative', className)}>
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-3">
        R$
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        value={value === null ? '' : formatDecimal(value)}
        onChange={handleChange}
        onPaste={handlePaste}
        className={cn(inputBase, 'tnum h-10 pr-3 pl-9 text-right')}
        {...props}
      />
    </div>
  )
}

export function MoneyField({
  label,
  error,
  hint,
  className,
  optional,
  value,
  onValueChange,
  ...props
}: BaseProps & {
  value: number | null
  onValueChange: (cents: number | null) => void
  disabled?: boolean
  name?: string
  autoFocus?: boolean
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <MoneyInput
        id={id}
        value={value}
        onValueChange={onValueChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  )
}

export function DateField({
  label,
  error,
  hint,
  className,
  optional,
  value,
  onValueChange,
  min,
  max,
  disabled,
  name,
}: BaseProps & {
  value: string | null
  onValueChange: (iso: string | null) => void
  min?: string
  max?: string
  disabled?: boolean
  name?: string
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className} optional={optional}>
      <input
        id={id}
        name={name}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(e) => onValueChange(e.target.value === '' ? null : e.target.value)}
        className={cn(inputBase, 'tnum h-10 px-3')}
      />
    </FieldShell>
  )
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded-[5px] accent-[var(--accent)]"
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-ink">
        {label}
        {description ? <span className="mt-0.5 block text-[12.5px] text-ink-3">{description}</span> : null}
      </label>
    </div>
  )
}
