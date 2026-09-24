import { Repeat, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import { Checkbox, DateField, MoneyField, SelectField, TextField, TextareaField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { repo } from '@/db/repo'
import { EXPENSE_CATEGORY_LABEL } from '@/domain/labels'
import { expenseFormSchema, fieldErrors } from '@/domain/schemas'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type RecurringExpense } from '@/domain/types'
import { useRetained } from '@/hooks/useRetained'
import { useAction } from '../hooks'

const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABEL[c] }))

export function ExpenseForm({ open, expense, onClose }: { open: boolean; expense: Expense | null; onClose: () => void }) {
  const editing = expense !== null
  const confirm = useConfirm()
  const run = useAction()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar despesa' : 'Nova despesa'}
      description={expense?.recurringId ? 'Lançamento de uma despesa recorrente. A alteração vale só para este mês.' : undefined}
      footer={
        <>
          {expense ? (
            <Button
              variant="ghost"
              className="text-bad hover:bg-bad-soft hover:text-bad sm:mr-auto"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Excluir despesa?',
                  description: `“${expense.description}” será removida.`,
                  confirmLabel: 'Excluir',
                  tone: 'danger',
                })
                if (ok && (await run(() => repo.deleteExpense(expense.id), 'Despesa excluída'))) onClose()
              }}
            >
              Excluir
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="expense-form">
            {editing ? 'Salvar alterações' : 'Salvar despesa'}
          </Button>
        </>
      }
    >
      <ExpenseFormBody expense={expense ?? undefined} onDone={onClose} />
    </Modal>
  )
}

function ExpenseFormBody({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const { today } = useData()
  const run = useAction()
  const [description, setDescription] = useState(expense?.description ?? '')
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'software')
  const [amount, setAmount] = useState<number | null>(expense?.amountCents ?? null)
  const [date, setDate] = useState<string | null>(expense?.date ?? today)
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [repeat, setRepeat] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = expenseFormSchema.safeParse({
      description,
      category,
      amountCents: amount ?? 0,
      date: date ?? '',
      notes,
      repeatMonthly: repeat,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    const ok = await run(
      () => repo.saveExpense({ id: expense?.id, values: parsed.data }),
      expense ? 'Despesa atualizada' : repeat ? 'Despesa recorrente criada' : 'Despesa registrada',
    )
    if (ok) onDone()
  }

  return (
    <form id="expense-form" noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField
        label="Descrição"
        placeholder="Ex.: Assinatura do Figma"
        value={description}
        onValueChange={(v) => {
          setDescription(v)
          setErrors((x) => ({ ...x, description: '' }))
        }}
        error={errors.description || undefined}
        className="sm:col-span-2"
      />
      <SelectField label="Categoria" value={category} onValueChange={setCategory} options={categoryOptions} />
      <MoneyField
        label="Valor"
        value={amount}
        onValueChange={(v) => {
          setAmount(v)
          setErrors((x) => ({ ...x, amountCents: '' }))
        }}
        error={errors.amountCents || undefined}
      />
      <DateField
        label={repeat ? 'Primeiro lançamento' : 'Data'}
        value={date}
        onValueChange={setDate}
        error={errors.date || undefined}
      />
      {!expense ? (
        <div className="flex items-end pb-2">
          <Checkbox
            checked={repeat}
            onCheckedChange={setRepeat}
            label={
              <span className="inline-flex items-center gap-1.5">
                <Repeat className="size-3.5 text-ink-3" /> Repetir todo mês
              </span>
            }
            description="Lançada automaticamente no mesmo dia de cada mês."
          />
        </div>
      ) : null}
      <TextareaField label="Observações" optional value={notes} onValueChange={setNotes} className="sm:col-span-2" />
    </form>
  )
}

export function RecurringForm({ rule: current, onClose }: { rule: RecurringExpense | null; onClose: () => void }) {
  const rule = useRetained(current)
  const confirm = useConfirm()
  const run = useAction()
  return (
    <Modal
      open={current !== null}
      onClose={onClose}
      title="Despesa recorrente"
      description="Alterações valem para os próximos lançamentos. Lançamentos já feitos não mudam."
      footer={
        rule ? (
          <>
            <Button
              variant="ghost"
              className="text-bad hover:bg-bad-soft hover:text-bad sm:mr-auto"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Excluir recorrência?',
                  description: 'Os lançamentos já feitos continuam no histórico; apenas os próximos deixam de ser gerados.',
                  confirmLabel: 'Excluir recorrência',
                  tone: 'danger',
                })
                if (ok && (await run(() => repo.deleteRecurringExpense(rule.id), 'Recorrência excluída'))) onClose()
              }}
            >
              Excluir
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (
                  await run(
                    () => repo.setRecurringExpenseActive(rule.id, !rule.active),
                    rule.active ? 'Recorrência pausada' : 'Recorrência reativada',
                  )
                )
                  onClose()
              }}
            >
              {rule.active ? 'Pausar' : 'Reativar'}
            </Button>
            <Button variant="primary" type="submit" form="recurring-form">
              Salvar
            </Button>
          </>
        ) : null
      }
    >
      {rule ? <RecurringFormBody key={rule.id} rule={rule} onDone={onClose} /> : null}
    </Modal>
  )
}

function RecurringFormBody({ rule, onDone }: { rule: RecurringExpense; onDone: () => void }) {
  const run = useAction()
  const [description, setDescription] = useState(rule.description)
  const [category, setCategory] = useState<ExpenseCategory>(rule.category)
  const [amount, setAmount] = useState<number | null>(rule.amountCents)
  const [errors, setErrors] = useState<Record<string, string>>({})
  return (
    <form
      id="recurring-form"
      noValidate
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const next: Record<string, string> = {}
        if (!description.trim()) next.description = 'Descreva a despesa'
        if (!amount || amount <= 0) next.amountCents = 'Informe um valor maior que zero'
        setErrors(next)
        if (Object.keys(next).length) return
        if (
          await run(
            () => repo.updateRecurringExpense(rule.id, { description: description.trim(), category, amountCents: amount! }),
            'Recorrência atualizada',
          )
        )
          onDone()
      }}
    >
      <TextField
        label="Descrição"
        value={description}
        onValueChange={setDescription}
        error={errors.description}
        className="sm:col-span-2"
      />
      <SelectField label="Categoria" value={category} onValueChange={setCategory} options={categoryOptions} />
      <MoneyField label="Valor mensal" value={amount} onValueChange={setAmount} error={errors.amountCents} />
    </form>
  )
}
