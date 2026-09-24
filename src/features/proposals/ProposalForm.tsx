import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import { DateField, FieldShell, MoneyField, NativeSelect, SelectField, TextField, TextareaField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { repo } from '@/db/repo'
import { PROPOSAL_STAGE_LABEL, SERVICE_TYPE_LABEL } from '@/domain/labels'
import { fieldErrors, proposalFormSchema } from '@/domain/schemas'
import { SERVICE_TYPES, type Proposal, type ProposalStage, type ServiceType } from '@/domain/types'
import { useAction } from '../hooks'

const EDITABLE_STAGES: ProposalStage[] = ['lead', 'proposal', 'negotiation', 'lost']
const LEAD = '__lead__'

export function ProposalForm({ open, proposal, onClose }: { open: boolean; proposal: Proposal | null; onClose: () => void }) {
  const confirm = useConfirm()
  const run = useAction()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={proposal ? 'Editar proposta' : 'Nova proposta'}
      footer={
        <>
          {proposal ? (
            <Button
              variant="ghost"
              className="text-bad hover:bg-bad-soft hover:text-bad sm:mr-auto"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Excluir proposta?',
                  description: `“${proposal.title}” será removida do pipeline.`,
                  confirmLabel: 'Excluir',
                  tone: 'danger',
                })
                if (ok && (await run(() => repo.deleteProposal(proposal.id), 'Proposta excluída'))) onClose()
              }}
            >
              Excluir
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="proposal-form">
            {proposal ? 'Salvar alterações' : 'Criar proposta'}
          </Button>
        </>
      }
    >
      <ProposalFormBody proposal={proposal} onDone={onClose} />
    </Modal>
  )
}

function ProposalFormBody({ proposal, onDone }: { proposal: Proposal | null; onDone: () => void }) {
  const { ds, today } = useData()
  const run = useAction()
  const clients = useMemo(() => [...ds.clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [ds.clients])
  const [clientId, setClientId] = useState<string>(proposal?.clientId ?? LEAD)
  const [leadName, setLeadName] = useState(proposal?.leadName ?? '')
  const [leadEmail, setLeadEmail] = useState(proposal?.leadEmail ?? '')
  const [leadPhone, setLeadPhone] = useState(proposal?.leadPhone ?? '')
  const [title, setTitle] = useState(proposal?.title ?? '')
  const [serviceType, setServiceType] = useState<ServiceType>(proposal?.serviceType ?? 'institutional_site')
  const [value, setValue] = useState<number | null>(proposal && proposal.valueCents > 0 ? proposal.valueCents : null)
  const [createdDate, setCreatedDate] = useState<string | null>(proposal?.createdDate ?? today)
  const [expected, setExpected] = useState<string | null>(proposal?.expectedCloseDate ?? null)
  const [stage, setStage] = useState<ProposalStage>(proposal?.stage ?? 'lead')
  const [notes, setNotes] = useState(proposal?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isLead = clientId === LEAD
  const won = proposal?.stage === 'won'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = proposalFormSchema.safeParse({
      title,
      clientId: isLead ? null : clientId,
      leadName: isLead ? leadName : '',
      leadEmail: isLead ? leadEmail : '',
      leadPhone: isLead ? leadPhone : '',
      serviceType,
      valueCents: value ?? 0,
      createdDate: createdDate ?? '',
      expectedCloseDate: expected,
      notes,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    const ok = await run(
      () => repo.saveProposal({ id: proposal?.id, values: parsed.data, stage: won ? undefined : stage }),
      proposal ? 'Proposta atualizada' : 'Proposta criada',
    )
    if (ok) onDone()
  }

  return (
    <form id="proposal-form" noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField
        label="Título"
        placeholder="Ex.: Loja virtual da Aurora"
        value={title}
        onValueChange={setTitle}
        error={errors.title}
        className="sm:col-span-2"
      />
      <FieldShell id="proposal-client" label="Cliente ou lead" className="sm:col-span-2">
        <NativeSelect id="proposal-client" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={won}>
          <option value={LEAD}>Lead (ainda não é cliente)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </FieldShell>
      {isLead ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2/50 p-4 sm:col-span-2 sm:grid-cols-3">
          <TextField label="Nome do lead" value={leadName} onValueChange={setLeadName} error={errors.leadName} />
          <TextField
            label="E-mail"
            optional
            type="email"
            value={leadEmail}
            onValueChange={setLeadEmail}
            error={errors.leadEmail}
          />
          <TextField label="Telefone" optional type="tel" value={leadPhone} onValueChange={setLeadPhone} />
        </div>
      ) : null}
      <SelectField
        label="Tipo de serviço"
        value={serviceType}
        onValueChange={setServiceType}
        options={SERVICE_TYPES.map((t) => ({ value: t, label: SERVICE_TYPE_LABEL[t] }))}
      />
      <MoneyField label="Valor estimado" optional value={value} onValueChange={setValue} error={errors.valueCents} />
      <DateField label="Criada em" value={createdDate} onValueChange={setCreatedDate} error={errors.createdDate} />
      <DateField label="Previsão de fechamento" optional value={expected} onValueChange={setExpected} />
      {won ? (
        <p className="rounded-lg bg-good-soft px-3 py-2 text-[13px] text-good sm:col-span-2">
          Proposta ganha e convertida em venda.
        </p>
      ) : (
        <SelectField
          label="Etapa"
          value={stage}
          onValueChange={setStage}
          options={EDITABLE_STAGES.map((s) => ({ value: s, label: PROPOSAL_STAGE_LABEL[s] }))}
          hint="Para marcar como ganha, use “Converter em venda”."
          className="sm:col-span-2"
        />
      )}
      <TextareaField label="Observações" optional value={notes} onValueChange={setNotes} className="sm:col-span-2" />
    </form>
  )
}
