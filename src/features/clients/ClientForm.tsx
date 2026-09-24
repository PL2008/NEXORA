import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField, TextareaField } from '@/components/ui/fields'
import { repo } from '@/db/repo'
import { clientFormSchema, fieldErrors, type ClientFormValues } from '@/domain/schemas'
import type { Client } from '@/domain/types'
import { useAction } from '../hooks'

export function ClientForm({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean
  client: Client | null
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="client-form">
            {client ? 'Salvar alterações' : 'Salvar cliente'}
          </Button>
        </>
      }
    >
      <ClientFormBody client={client} onDone={(id) => (onSaved ? onSaved(id) : onClose())} />
    </Modal>
  )
}

function ClientFormBody({ client, onDone }: { client: Client | null; onDone: (id: string) => void }) {
  const run = useAction()
  const [values, setValues] = useState<ClientFormValues>({
    name: client?.name ?? '',
    company: client?.company ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    document: client?.document ?? '',
    notes: client?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof ClientFormValues) => (v: string) => {
    setValues((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = clientFormSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    let id = client?.id ?? ''
    const ok = await run(
      async () => {
        if (client) await repo.updateClient(client.id, parsed.data)
        else id = await repo.createClient(parsed.data)
      },
      client ? 'Cliente atualizado' : 'Cliente cadastrado',
    )
    if (ok) onDone(id)
  }

  return (
    <form id="client-form" noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField
        label="Nome"
        value={values.name}
        onValueChange={set('name')}
        error={errors.name || undefined}
        autoComplete="off"
      />
      <TextField label="Empresa" optional value={values.company} onValueChange={set('company')} autoComplete="off" />
      <TextField
        label="E-mail"
        optional
        type="email"
        value={values.email}
        onValueChange={set('email')}
        error={errors.email || undefined}
        autoComplete="off"
      />
      <TextField
        label="Telefone / WhatsApp"
        optional
        type="tel"
        value={values.phone}
        onValueChange={set('phone')}
        autoComplete="off"
      />
      <TextField label="CPF / CNPJ" optional value={values.document} onValueChange={set('document')} autoComplete="off" />
      <TextareaField label="Observações" optional value={values.notes} onValueChange={set('notes')} className="sm:col-span-2" />
    </form>
  )
}
