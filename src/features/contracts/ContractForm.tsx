import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import {
  Checkbox,
  DateField,
  FieldShell,
  MoneyField,
  NativeSelect,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { repo } from '@/db/repo'
import { SERVICE_TYPE_LABEL } from '@/domain/labels'
import { contractFormSchema, fieldErrors } from '@/domain/schemas'
import { SERVICE_TYPES, type Contract, type ServiceType } from '@/domain/types'
import { parseISODate } from '@/lib/dates'
import { useAction } from '../hooks'

export function ContractForm({ open, contract, onClose }: { open: boolean; contract: Contract | null; onClose: () => void }) {
  const { ds } = useData()
  const canSubmit = contract !== null || ds.clients.length > 0
  const confirm = useConfirm()
  const run = useAction()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contract ? 'Editar contrato' : 'Novo contrato recorrente'}
      description={
        contract
          ? 'Mudanças no valor valem para cobranças em aberto a partir de hoje.'
          : 'As cobranças mensais são geradas automaticamente todo mês.'
      }
      footer={
        <>
          {contract ? (
            <Button
              variant="ghost"
              className="text-bad hover:bg-bad-soft hover:text-bad sm:mr-auto"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Excluir contrato?',
                  description:
                    'O contrato e todas as suas cobranças (inclusive as pagas) serão removidos. Para manter o histórico, prefira encerrar o contrato.',
                  confirmLabel: 'Excluir contrato',
                  tone: 'danger',
                })
                if (ok && (await run(() => repo.deleteContract(contract.id), 'Contrato excluído'))) onClose()
              }}
            >
              Excluir
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {canSubmit ? (
            <Button variant="primary" type="submit" form="contract-form">
              {contract ? 'Salvar alterações' : 'Criar contrato'}
            </Button>
          ) : null}
        </>
      }
    >
      <ContractFormBody contract={contract} onDone={onClose} />
    </Modal>
  )
}

function ContractFormBody({ contract, onDone }: { contract: Contract | null; onDone: () => void }) {
  const { ds, today } = useData()
  const run = useAction()
  const clients = useMemo(() => [...ds.clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [ds.clients])
  const [clientId, setClientId] = useState(contract?.clientId ?? '')
  const [description, setDescription] = useState(contract?.description ?? '')
  const [serviceType, setServiceType] = useState<ServiceType>(contract?.serviceType ?? 'maintenance')
  const [monthly, setMonthly] = useState<number | null>(contract?.monthlyCents ?? null)
  const [startDate, setStartDate] = useState<string | null>(contract?.startDate ?? today)
  const [billingDay, setBillingDay] = useState<number>(contract?.billingDay ?? parseISODate(today).day)
  const [endDate, setEndDate] = useState<string | null>(contract?.endDate ?? null)
  const [notes, setNotes] = useState(contract?.notes ?? '')
  const [markPaid, setMarkPaid] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const retroactive = !contract && startDate !== null && startDate < today

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = contractFormSchema.safeParse({
      clientId,
      description,
      serviceType,
      monthlyCents: monthly ?? 0,
      billingDay,
      startDate: startDate ?? '',
      endDate,
      notes,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    const ok = await run(
      () => repo.saveContract({ id: contract?.id, values: parsed.data, markPastAsPaid: retroactive && markPaid }),
      contract ? 'Contrato atualizado' : 'Contrato criado',
    )
    if (ok) onDone()
  }

  if (clients.length === 0 && !contract) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">
        Todo contrato pertence a um cliente.{' '}
        <Link to="/clientes?novo=1" className="font-medium text-accent-ink hover:underline">
          Cadastre o primeiro cliente
        </Link>
        .
      </div>
    )
  }

  return (
    <form id="contract-form" noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FieldShell id="contract-client" label="Cliente" error={errors.clientId} className="sm:col-span-2">
        <NativeSelect
          id="contract-client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-invalid={errors.clientId ? true : undefined}
        >
          <option value="" disabled>
            Selecione o cliente
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </FieldShell>
      <TextField
        label="Descrição"
        placeholder="Ex.: Manutenção e suporte do site"
        value={description}
        onValueChange={setDescription}
        error={errors.description}
        className="sm:col-span-2"
      />
      <SelectField
        label="Tipo de serviço"
        value={serviceType}
        onValueChange={setServiceType}
        options={SERVICE_TYPES.map((t) => ({ value: t, label: SERVICE_TYPE_LABEL[t] }))}
      />
      <MoneyField label="Valor mensal" value={monthly} onValueChange={setMonthly} error={errors.monthlyCents} />
      <DateField label="Início" value={startDate} onValueChange={setStartDate} error={errors.startDate} />
      <FieldShell
        id="contract-day"
        label="Dia do vencimento"
        error={errors.billingDay}
        hint="Em meses mais curtos, vence no último dia."
      >
        <NativeSelect id="contract-day" value={billingDay} onChange={(e) => setBillingDay(Number(e.target.value))}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </NativeSelect>
      </FieldShell>
      <DateField
        label="Término"
        optional
        value={endDate}
        onValueChange={setEndDate}
        error={errors.endDate}
        hint="Deixe vazio para contrato sem prazo."
      />
      {retroactive ? (
        <div className="flex items-end sm:pb-6">
          <Checkbox
            checked={markPaid}
            onCheckedChange={setMarkPaid}
            label="Marcar cobranças anteriores a hoje como pagas"
            description="Útil ao cadastrar um contrato que já estava em andamento."
          />
        </div>
      ) : null}
      <TextareaField label="Observações" optional value={notes} onValueChange={setNotes} className="sm:col-span-2" />
    </form>
  )
}
