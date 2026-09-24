import { useState } from 'react'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { DateField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { repo } from '@/db/repo'
import { describeReceivable } from '@/domain/metrics'
import type { Receivable } from '@/domain/types'
import { useRetained } from '@/hooks/useRetained'
import { formatDate } from '@/lib/dates'
import { formatBRL } from '@/lib/money'
import { useAction, useClientName, useIndex } from '../hooks'

/** Confirma o recebimento de uma parcela, com a data do pagamento (padrão: hoje). */
export function ReceiveDialog({ receivable: current, onClose }: { receivable: Receivable | null; onClose: () => void }) {
  const receivable = useRetained(current)
  return (
    <Modal
      open={current !== null}
      onClose={onClose}
      size="sm"
      title="Registrar recebimento"
      description={receivable ? <ReceiveSummary receivable={receivable} /> : null}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="receive-form">
            Confirmar recebimento
          </Button>
        </>
      }
    >
      {receivable ? <ReceiveForm key={receivable.id} receivable={receivable} onDone={onClose} /> : null}
    </Modal>
  )
}

function ReceiveSummary({ receivable }: { receivable: Receivable }) {
  const index = useIndex()
  const clientName = useClientName()
  const d = describeReceivable(receivable, index)
  return (
    <>
      <span className="font-medium text-ink">{formatBRL(receivable.amountCents)}</span> de {clientName(receivable.clientId)} —{' '}
      {d.title} ({d.detail.toLowerCase()}), vencimento {formatDate(receivable.dueDate)}.
    </>
  )
}

function ReceiveForm({ receivable, onDone }: { receivable: Receivable; onDone: () => void }) {
  const { today } = useData()
  const run = useAction()
  const [date, setDate] = useState<string | null>(today)
  const [error, setError] = useState<string>()
  return (
    <form
      id="receive-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault()
        if (!date) {
          setError('Informe a data do pagamento')
          return
        }
        const ok = await run(() => repo.markReceivablePaid(receivable.id, date), {
          title: 'Recebimento registrado',
          description: formatBRL(receivable.amountCents),
          action: { label: 'Desfazer', onClick: () => void repo.markReceivableUnpaid(receivable.id) },
        })
        if (ok) onDone()
      }}
    >
      <DateField label="Data do pagamento" value={date} onValueChange={setDate} error={error} max={today} />
    </form>
  )
}
