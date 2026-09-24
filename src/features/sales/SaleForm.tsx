import { Plus, Trash2, UserPlus, Wand2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import {
  Checkbox,
  DateField,
  FieldShell,
  MoneyField,
  MoneyInput,
  NativeSelect,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/ui/fields'
import { inputBase, inputFrame } from '@/components/ui/fieldStyles'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { repo } from '@/db/repo'
import { PAYMENT_MODE_LABEL, PROJECT_STATUS_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { planForMode } from '@/domain/installments'
import { fieldErrors, saleFormSchema, type SaleFormValues } from '@/domain/schemas'
import {
  PAYMENT_MODES,
  PROJECT_STATUSES,
  SERVICE_TYPES,
  type PaymentMode,
  type ProjectStatus,
  type Proposal,
  type Receivable,
  type Sale,
  type ServiceType,
} from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'
import { createId } from '@/lib/id'
import { formatBRL, formatPercent } from '@/lib/money'
import { useAction } from '../hooks'

interface Row {
  key: string
  id?: string
  amountCents: number | null
  dueDate: string | null
  paidDate: string | null
}

interface CostRow {
  key: string
  description: string
  amountCents: number | null
}

interface State {
  clientId: string
  newClientName: string
  newClientEmail: string
  newClientPhone: string
  title: string
  serviceType: ServiceType
  totalCents: number | null
  date: string | null
  status: ProjectStatus
  deadline: string | null
  paymentMode: PaymentMode
  count: number
  firstDueDate: string | null
  rows: Row[]
  costs: CostRow[]
  notes: string
}

const NEW_CLIENT = '__new__'

function regenerate(s: State, previous: Row[]): Row[] {
  if (s.paymentMode === 'custom') return previous
  const total = s.totalCents ?? 0
  const first = s.firstDueDate ?? s.date
  if (!first || total <= 0) {
    return previous.length
      ? previous.map((r) => ({ ...r, amountCents: null }))
      : [{ key: createId(), amountCents: null, dueDate: first, paidDate: null }]
  }
  const plan = planForMode(s.paymentMode, total, s.count, first)
  return plan.map((p, i) => {
    const prev = previous[i]
    return {
      key: prev?.key ?? createId(),
      id: prev?.id,
      amountCents: p.amountCents,
      dueDate: p.dueDate,
      paidDate: prev?.paidDate ?? null,
    }
  })
}

function initialState(today: string, sale?: Sale, receivables?: Receivable[], proposal?: Proposal, clientId?: string): State {
  if (sale) {
    const rows = (receivables ?? [])
      .filter((r) => r.saleId === sale.id)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((r) => ({ key: r.id, id: r.id, amountCents: r.amountCents, dueDate: r.dueDate, paidDate: r.paidDate }))
    return {
      clientId: sale.clientId,
      newClientName: '',
      newClientEmail: '',
      newClientPhone: '',
      title: sale.title,
      serviceType: sale.serviceType,
      totalCents: sale.totalCents,
      date: sale.date,
      status: sale.status,
      deadline: sale.deadline,
      paymentMode: sale.paymentMode,
      count: Math.max(2, rows.length),
      firstDueDate: rows[0]?.dueDate ?? sale.date,
      rows,
      costs: sale.costs.map((c) => ({ key: c.id, description: c.description, amountCents: c.amountCents })),
      notes: sale.notes,
    }
  }
  const base: State = {
    clientId: proposal ? (proposal.clientId ?? NEW_CLIENT) : (clientId ?? ''),
    newClientName: proposal && !proposal.clientId ? proposal.leadName : '',
    newClientEmail: proposal && !proposal.clientId ? proposal.leadEmail : '',
    newClientPhone: proposal && !proposal.clientId ? proposal.leadPhone : '',
    title: proposal?.title ?? '',
    serviceType: proposal?.serviceType ?? 'institutional_site',
    totalCents: proposal && proposal.valueCents > 0 ? proposal.valueCents : null,
    date: today,
    status: 'not_started',
    deadline: null,
    paymentMode: 'single',
    count: 2,
    firstDueDate: today,
    rows: [],
    costs: [],
    notes: proposal?.notes ?? '',
  }
  return { ...base, rows: regenerate(base, []) }
}

export function SaleForm({
  open,
  onClose,
  sale,
  proposal,
  clientId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  sale?: Sale
  proposal?: Proposal
  /** Cliente pré-selecionado ao criar. */
  clientId?: string
  /** Quando informado, o chamador fecha o formulário após salvar. */
  onSaved?: (id: string) => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={sale ? 'Editar venda' : proposal ? 'Converter proposta em venda' : 'Nova venda'}
      description={
        proposal
          ? `A proposta “${proposal.title}” será marcada como ganha.`
          : 'Registre o projeto, o valor e como o cliente vai pagar.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="sale-form">
            {sale ? 'Salvar alterações' : 'Salvar venda'}
          </Button>
        </>
      }
    >
      <SaleFormBody sale={sale} proposal={proposal} clientId={clientId} onDone={(id) => (onSaved ? onSaved(id) : onClose())} />
    </Modal>
  )
}

function SaleFormBody({
  sale,
  proposal,
  clientId,
  onDone,
}: {
  sale?: Sale
  proposal?: Proposal
  clientId?: string | undefined
  onDone: (id: string) => void
}) {
  const { ds, today } = useData()
  const run = useAction()
  const [state, setState] = useState<State>(() =>
    initialState(
      today,
      sale,
      ds.receivables,
      proposal,
      clientId && ds.clients.some((c) => c.id === clientId) ? clientId : undefined,
    ),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const clients = useMemo(() => [...ds.clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [ds.clients])

  const update = (patch: Partial<State>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      const planChanged =
        'totalCents' in patch ||
        'count' in patch ||
        'firstDueDate' in patch ||
        'paymentMode' in patch ||
        ('date' in patch && !prev.firstDueDate)
      if (planChanged && next.paymentMode !== 'custom') next.rows = regenerate(next, prev.rows)
      return next
    })
    setErrors((e) => {
      const keys = Object.keys(patch)
      if (!keys.some((k) => Object.keys(e).some((ek) => ek === k || ek.startsWith(`${k}.`)))) return e
      const out = { ...e }
      for (const k of Object.keys(out)) if (keys.some((p) => k === p || k.startsWith(`${p}.`))) delete out[k]
      return out
    })
  }

  const setRow = (key: string, patch: Partial<Row>) => {
    setState((prev) => ({ ...prev, rows: prev.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))
    setErrors((e) => {
      if (!Object.keys(e).some((k) => k.startsWith('installments'))) return e
      return Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('installments')))
    })
  }
  const setCost = (key: string, patch: Partial<CostRow>) =>
    setState((prev) => ({ ...prev, costs: prev.costs.map((c) => (c.key === key ? { ...c, ...patch } : c)) }))

  const total = state.totalCents ?? 0
  const sum = state.rows.reduce((acc, r) => acc + (r.amountCents ?? 0), 0)
  const diff = total - sum
  const costsTotal = state.costs.reduce((acc, c) => acc + (c.amountCents ?? 0), 0)
  const margin = total - costsTotal
  const isNewClient = state.clientId === NEW_CLIENT

  const toValues = (): SaleFormValues => ({
    clientId: isNewClient || state.clientId === '' ? null : state.clientId,
    newClientName: isNewClient ? state.newClientName.trim() : '',
    newClientEmail: isNewClient ? state.newClientEmail.trim() : '',
    newClientPhone: isNewClient ? state.newClientPhone.trim() : '',
    title: state.title,
    serviceType: state.serviceType,
    totalCents: state.totalCents ?? 0,
    date: state.date ?? '',
    status: state.status,
    deadline: state.deadline,
    paymentMode: state.paymentMode,
    installments: state.rows.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      amountCents: r.amountCents ?? 0,
      dueDate: r.dueDate ?? '',
      paidDate: r.paidDate,
    })),
    costs: state.costs.map((c) => ({ id: c.key, description: c.description.trim(), amountCents: c.amountCents ?? 0 })),
    notes: state.notes,
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const parsed = saleFormSchema.safeParse(toValues())
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error)
      if (errs.clientId && isNewClient) errs.newClientName = 'Informe o nome do cliente'
      setErrors(errs)
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    let savedId = ''
    const ok = await run(
      async () => {
        savedId = await repo.saveSale({ id: sale?.id, values: parsed.data, proposalId: proposal?.id ?? null })
      },
      sale ? 'Venda atualizada' : 'Venda registrada',
    )
    setSaving(false)
    if (ok) onDone(savedId)
  }

  const rowError = (i: number, field: 'amountCents' | 'dueDate' | 'paidDate') => errors[`installments.${i}.${field}`]
  const costError = (i: number, field: 'description' | 'amountCents') => errors[`costs.${i}.${field}`]

  return (
    <form id="sale-form" ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Cliente e projeto</legend>
        <FieldShell
          id="sale-client"
          label="Cliente"
          error={errors.clientId && !isNewClient ? errors.clientId : undefined}
          className="sm:col-span-2"
        >
          <NativeSelect
            id="sale-client"
            value={state.clientId}
            aria-invalid={errors.clientId && !isNewClient ? true : undefined}
            onChange={(e) => update({ clientId: e.target.value })}
          >
            <option value="" disabled>
              {clients.length ? 'Selecione o cliente' : 'Nenhum cliente cadastrado'}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ''}
              </option>
            ))}
            <option value={NEW_CLIENT}>+ Cadastrar novo cliente</option>
          </NativeSelect>
        </FieldShell>
        <AnimatePresence initial={false}>
          {isNewClient ? (
            <motion.div
              key="new-client"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden sm:col-span-2"
            >
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2/50 p-4 sm:grid-cols-3">
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink sm:col-span-3">
                  <UserPlus className="size-4 text-ink-3" /> Novo cliente
                </p>
                <TextField
                  label="Nome"
                  value={state.newClientName}
                  onValueChange={(v) => update({ newClientName: v })}
                  error={errors.newClientName}
                  autoComplete="off"
                />
                <TextField
                  label="E-mail"
                  optional
                  type="email"
                  value={state.newClientEmail}
                  onValueChange={(v) => update({ newClientEmail: v })}
                  error={errors.newClientEmail}
                />
                <TextField
                  label="Telefone"
                  optional
                  type="tel"
                  value={state.newClientPhone}
                  onValueChange={(v) => update({ newClientPhone: v })}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <TextField
          label="Projeto"
          placeholder="Ex.: Site da Padaria Aurora"
          value={state.title}
          onValueChange={(v) => update({ title: v })}
          error={errors.title}
          className="sm:col-span-2"
        />
        <SelectField
          label="Tipo de serviço"
          value={state.serviceType}
          onValueChange={(v) => update({ serviceType: v })}
          options={SERVICE_TYPES.map((t) => ({ value: t, label: SERVICE_TYPE_LABEL[t] }))}
        />
        <SelectField
          label="Status do projeto"
          value={state.status}
          onValueChange={(v) => update({ status: v })}
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))}
        />
        <DateField label="Data da venda" value={state.date} onValueChange={(v) => update({ date: v })} error={errors.date} />
        <DateField
          label="Prazo de entrega"
          optional
          value={state.deadline}
          onValueChange={(v) => update({ deadline: v })}
          error={errors.deadline}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Valor e pagamento</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyField
            label="Valor total"
            value={state.totalCents}
            onValueChange={(v) => update({ totalCents: v })}
            error={errors.totalCents}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Forma de pagamento</span>
            <Segmented
              label="Forma de pagamento"
              value={state.paymentMode}
              onChange={(v) => update({ paymentMode: v })}
              options={PAYMENT_MODES.map((m) => ({ value: m, label: PAYMENT_MODE_LABEL[m] }))}
              stretch
            />
          </div>
        </div>
        {state.paymentMode !== 'custom' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {state.paymentMode === 'installments' ? (
              <FieldShell id="sale-count" label="Número de parcelas">
                <NativeSelect id="sale-count" value={state.count} onChange={(e) => update({ count: Number(e.target.value) })}>
                  {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>
                      {n}x {total > 0 ? `de ${formatBRL(Math.floor(total / n))}` : ''}
                    </option>
                  ))}
                </NativeSelect>
              </FieldShell>
            ) : null}
            <DateField
              label={state.paymentMode === 'single' ? 'Vencimento' : '1º vencimento'}
              value={state.firstDueDate}
              onValueChange={(v) => update({ firstDueDate: v })}
            />
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5">
            <p className="text-[13px] font-medium text-ink">
              Parcelas <span className="tnum text-ink-3">· {state.rows.length}</span>
            </p>
            <p className={cn('tnum text-[12.5px]', diff === 0 ? 'text-ink-3' : 'font-medium text-bad')} aria-live="polite">
              {diff === 0 ? `Soma ${formatBRL(sum)}` : diff > 0 ? `Faltam ${formatBRL(diff)}` : `Excede em ${formatBRL(-diff)}`}
            </p>
          </div>
          <ul className="divide-y divide-line">
            {state.rows.map((row, i) => (
              <li
                key={row.key}
                className="grid grid-cols-[auto_1fr_1fr_auto] items-start gap-2 px-3 py-2.5 sm:grid-cols-[28px_1.1fr_1fr_1.2fr_32px] sm:items-center sm:gap-3 sm:px-4"
              >
                <span className="tnum pt-2.5 text-[12px] font-medium text-ink-3 sm:pt-0">{i + 1}ª</span>
                {state.paymentMode === 'custom' ? (
                  <>
                    <MoneyInput
                      aria-label={`Valor da parcela ${i + 1}`}
                      value={row.amountCents}
                      onValueChange={(v) => setRow(row.key, { amountCents: v })}
                      aria-invalid={rowError(i, 'amountCents') ? true : undefined}
                    />
                    <input
                      type="date"
                      aria-label={`Vencimento da parcela ${i + 1}`}
                      value={row.dueDate ?? ''}
                      onChange={(e) => setRow(row.key, { dueDate: e.target.value || null })}
                      aria-invalid={rowError(i, 'dueDate') ? true : undefined}
                      className={cn(inputBase, 'tnum h-10 px-3')}
                    />
                  </>
                ) : (
                  <>
                    <span className="tnum pt-2.5 text-sm font-medium text-ink sm:pt-0">
                      {row.amountCents ? formatBRL(row.amountCents) : '—'}
                    </span>
                    <span className="tnum pt-2.5 text-sm text-ink-2 sm:pt-0">{row.dueDate ? formatDate(row.dueDate) : '—'}</span>
                  </>
                )}
                {state.paymentMode === 'custom' ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover parcela ${i + 1}`}
                    disabled={state.rows.length <= 1}
                    onClick={() => setState((p) => ({ ...p, rows: p.rows.filter((r) => r.key !== row.key) }))}
                    className="mt-1 sm:order-last sm:mt-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <span className="hidden sm:order-last sm:block" />
                )}
                <div className="col-span-3 col-start-2 flex min-h-10 items-center gap-3 sm:col-span-1 sm:col-start-auto">
                  <Checkbox
                    checked={row.paidDate !== null}
                    onCheckedChange={(v) =>
                      setRow(row.key, { paidDate: v ? (row.dueDate && row.dueDate <= today ? row.dueDate : today) : null })
                    }
                    label={<span className="text-[13px] text-ink-2">Recebida</span>}
                  />
                  {row.paidDate !== null ? (
                    <input
                      type="date"
                      aria-label={`Data de recebimento da parcela ${i + 1}`}
                      value={row.paidDate}
                      onChange={(e) => setRow(row.key, { paidDate: e.target.value || today })}
                      className={cn(inputFrame, 'tnum h-9 min-w-0 flex-1 px-2.5 text-base sm:text-sm')}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {state.paymentMode === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5 sm:px-4">
              <Button
                size="sm"
                variant="ghost"
                icon={<Plus className="size-4" />}
                onClick={() =>
                  setState((p) => {
                    const last = p.rows[p.rows.length - 1]
                    const remaining = (p.totalCents ?? 0) - p.rows.reduce((a, r) => a + (r.amountCents ?? 0), 0)
                    return {
                      ...p,
                      rows: [
                        ...p.rows,
                        {
                          key: createId(),
                          amountCents: remaining > 0 ? remaining : null,
                          dueDate: last?.dueDate ?? p.date,
                          paidDate: null,
                        },
                      ],
                    }
                  })
                }
              >
                Adicionar parcela
              </Button>
              {diff !== 0 && state.rows.length > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Wand2 className="size-4" />}
                  onClick={() =>
                    setState((p) => {
                      const rows = [...p.rows]
                      const last = rows[rows.length - 1]!
                      const value = (last.amountCents ?? 0) + diff
                      rows[rows.length - 1] = { ...last, amountCents: value > 0 ? value : last.amountCents }
                      return { ...p, rows }
                    })
                  }
                  disabled={(state.rows[state.rows.length - 1]?.amountCents ?? 0) + diff <= 0}
                >
                  Ajustar última parcela
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {errors.installments ? (
          <p role="alert" className="-mt-2 text-[12.5px] text-bad">
            {errors.installments}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Custos do projeto</legend>
        <p className="-mt-1 text-[13px] text-ink-3">Terceiros, licenças, plugins, domínio… Usados para calcular a margem.</p>
        <AnimatePresence initial={false}>
          {state.costs.map((cost, i) => (
            <motion.div
              key={cost.key}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_180px_auto]"
            >
              <input
                aria-label={`Descrição do custo ${i + 1}`}
                placeholder="Descrição"
                value={cost.description}
                onChange={(e) => setCost(cost.key, { description: e.target.value })}
                aria-invalid={costError(i, 'description') ? true : undefined}
                className={cn(inputBase, 'h-10 px-3')}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover custo ${i + 1}`}
                onClick={() => setState((p) => ({ ...p, costs: p.costs.filter((c) => c.key !== cost.key) }))}
                className="sm:order-last"
              >
                <Trash2 className="size-4" />
              </Button>
              <MoneyInput
                aria-label={`Valor do custo ${i + 1}`}
                value={cost.amountCents}
                onValueChange={(v) => setCost(cost.key, { amountCents: v })}
                aria-invalid={costError(i, 'amountCents') ? true : undefined}
                className="col-span-2 sm:col-span-1"
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="size-4" />}
            onClick={() =>
              setState((p) => ({ ...p, costs: [...p.costs, { key: createId(), description: '', amountCents: null }] }))
            }
          >
            Adicionar custo
          </Button>
          <div className="tnum flex items-baseline gap-4 text-[13px]">
            <span className="text-ink-3">
              Custos <span className="font-medium text-ink">{formatBRL(costsTotal)}</span>
            </span>
            <span className="text-ink-3">
              Margem{' '}
              <span className={cn('font-semibold', margin < 0 ? 'text-bad' : 'text-ink')}>
                {formatBRL(margin)}
                {total > 0 ? ` · ${formatPercent(margin / total)}` : ''}
              </span>
            </span>
          </div>
        </div>
        {Object.keys(errors).some((k) => k.startsWith('costs.')) ? (
          <p role="alert" className="text-[12.5px] text-bad">
            Preencha descrição e valor de cada custo.
          </p>
        ) : null}
      </fieldset>

      <TextareaField label="Observações" optional value={state.notes} onValueChange={(v) => update({ notes: v })} />
      {saving ? <span className="sr-only">Salvando…</span> : null}
    </form>
  )
}
