import { CheckCircle2, CircleAlert, CircleDashed, Clock3, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { CONTRACT_STATUS_LABEL, PROJECT_STATUS_LABEL, PROPOSAL_STAGE_LABEL } from '@/domain/labels'
import type { ReceivableState } from '@/domain/metrics'
import type { ContractStatus, ProjectStatus, ProposalStage } from '@/domain/types'
import { cn } from '@/lib/cn'

const RECEIVABLE_BADGE: Record<ReceivableState, { tone: BadgeTone; label: string; icon: ReactNode }> = {
  paid: { tone: 'good', label: 'Pago', icon: <CheckCircle2 className="size-3" aria-hidden /> },
  open: { tone: 'neutral', label: 'Em aberto', icon: <Clock3 className="size-3" aria-hidden /> },
  overdue: { tone: 'bad', label: 'Atrasado', icon: <CircleAlert className="size-3" aria-hidden /> },
  void: { tone: 'neutral', label: 'Cancelado', icon: <CircleDashed className="size-3" aria-hidden /> },
}

export function ReceivableBadge({ state }: { state: ReceivableState }) {
  const b = RECEIVABLE_BADGE[state]
  return (
    <Badge tone={b.tone} icon={b.icon}>
      {b.label}
    </Badge>
  )
}

const PROJECT_TONE: Record<ProjectStatus, BadgeTone> = {
  not_started: 'neutral',
  in_progress: 'accent',
  in_review: 'warn',
  delivered: 'good',
  cancelled: 'neutral',
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={PROJECT_TONE[status]} className={status === 'cancelled' ? 'line-through decoration-ink-3/60' : undefined}>
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  )
}

const CONTRACT_TONE: Record<ContractStatus, BadgeTone> = { active: 'good', paused: 'warn', ended: 'neutral' }

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge tone={CONTRACT_TONE[status]}>{CONTRACT_STATUS_LABEL[status]}</Badge>
}

const STAGE_TONE: Record<ProposalStage, BadgeTone> = {
  lead: 'neutral',
  proposal: 'accent',
  negotiation: 'warn',
  won: 'good',
  lost: 'bad',
}

export function StageBadge({ stage }: { stage: ProposalStage }) {
  return <Badge tone={STAGE_TONE[stage]}>{PROPOSAL_STAGE_LABEL[stage]}</Badge>
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  label = 'Buscar',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
  className?: string
}) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 w-full rounded-lg border border-line-strong bg-surface pr-8 pl-9 text-base text-ink transition-[border-color,box-shadow] outline-none placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'bad' | 'good'
}) {
  return (
    <div role="group" aria-label={label} className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card">
      <p className="truncate text-[12.5px] text-ink-3">{label}</p>
      <p
        className={cn(
          'mt-1 truncate text-lg font-semibold tracking-[-0.02em]',
          tone === 'bad' ? 'text-bad' : tone === 'good' ? 'text-good' : 'text-ink',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[12px] text-ink-3">{hint}</p> : null}
    </div>
  )
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[12.5px] text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
