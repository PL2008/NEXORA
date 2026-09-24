import { Database, Download, HardDrive, Monitor, Moon, ShieldCheck, Sun, TriangleAlert, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { useData } from '@/app/useData'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/useConfirm'
import { MoneyField, TextField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/useToast'
import { backupSummary, createBackup, parseBackup, restoreBackup } from '@/db/backup'
import { DomainError, repo } from '@/db/repo'
import { fieldErrors, settingsFormSchema } from '@/domain/schemas'
import type { ThemePreference } from '@/domain/types'
import { downloadFile } from '@/lib/csv'
import { formatDate } from '@/lib/dates'
import { APP_VERSION, CREDIT, IS_DESKTOP_APP, STORAGE_PLACE } from '@/lib/env'
import { Logo } from '@/components/layout/Logo'
import { Section } from '../shared'
import { useAction } from '../hooks'

export function SettingsPage() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.querySelector<HTMLElement>('input')?.focus({ preventScroll: true })
    }
  }, [hash])

  return (
    <>
      <PageHeader title="Configurações" description="Empresa, meta, aparência e seus dados" />
      <div className="flex max-w-3xl flex-col gap-4">
        <CompanySectionKeyed />
        <AppearanceSection />
        <BackupSection />
        <DangerSection />
        <AboutSection />
      </div>
    </>
  )
}

/** Remonta o formulário quando as configurações mudam fora dele (restauração, apagar tudo). */
function CompanySectionKeyed() {
  const { ds } = useData()
  return <CompanySection key={ds.settings.updatedAt || 'vazio'} />
}

function CompanySection() {
  const { ds } = useData()
  const run = useAction()
  const s = ds.settings
  const [values, setValues] = useState({ companyName: s.companyName, document: s.document, email: s.email, phone: s.phone })
  const [goal, setGoal] = useState<number | null>(s.monthlyGoalCents > 0 ? s.monthlyGoalCents : null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof values) => (v: string) => setValues((p) => ({ ...p, [k]: v }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = settingsFormSchema.safeParse({ ...values, monthlyGoalCents: goal ?? 0 })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    await run(() => repo.saveSettings(parsed.data), 'Configurações salvas')
  }

  return (
    <Section title="Empresa e meta" description="Aparecem no painel e nos relatórios.">
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <TextField
          label="Nome da empresa"
          placeholder="Nome da sua empresa"
          value={values.companyName}
          onValueChange={set('companyName')}
          error={errors.companyName}
        />
        <TextField label="CNPJ" optional value={values.document} onValueChange={set('document')} />
        <TextField label="E-mail" optional type="email" value={values.email} onValueChange={set('email')} error={errors.email} />
        <TextField label="Telefone" optional type="tel" value={values.phone} onValueChange={set('phone')} />
        <div id="meta" className="scroll-mt-24 sm:col-span-2">
          <MoneyField
            label="Meta de receita mensal"
            value={goal}
            onValueChange={setGoal}
            error={errors.monthlyGoalCents}
            hint="Comparada com a receita recebida no mês. Deixe vazio para não usar meta."
          />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </div>
      </form>
    </Section>
  )
}

function AppearanceSection() {
  const { ds } = useData()
  const run = useAction()
  return (
    <Section title="Aparência">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Tema</p>
          <p className="text-[13px] text-ink-3">“Sistema” acompanha a configuração do seu dispositivo.</p>
        </div>
        <Segmented<ThemePreference>
          label="Tema"
          value={ds.settings.theme}
          onChange={(t) => void run(() => repo.setTheme(t))}
          options={[
            {
              value: 'system',
              label: (
                <>
                  <Monitor className="size-3.5" /> Sistema
                </>
              ),
            },
            {
              value: 'light',
              label: (
                <>
                  <Sun className="size-3.5" /> Claro
                </>
              ),
            },
            {
              value: 'dark',
              label: (
                <>
                  <Moon className="size-3.5" /> Escuro
                </>
              ),
            },
          ]}
        />
      </div>
    </Section>
  )
}

function usePersisted() {
  const [state, setState] = useState<'unknown' | 'yes' | 'no' | 'unsupported'>('unknown')
  useEffect(() => {
    let alive = true
    const storage = navigator.storage
    if (!storage?.persisted) {
      queueMicrotask(() => alive && setState('unsupported'))
      return
    }
    storage.persisted().then(
      (v) => alive && setState(v ? 'yes' : 'no'),
      () => alive && setState('unsupported'),
    )
    return () => {
      alive = false
    }
  }, [])
  const request = async () => {
    const ok = (await navigator.storage?.persist?.()) ?? false
    setState(ok ? 'yes' : 'no')
    return ok
  }
  return [state, request] as const
}

function BackupSection() {
  const { ds, today } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const inputRef = useRef<HTMLInputElement>(null)
  const [persisted, requestPersist] = usePersisted()

  const onExport = async () => {
    const backup = await createBackup()
    downloadFile(`nexora-backup-${today}.json`, JSON.stringify(backup, null, 2), 'application/json')
    toast({ title: 'Backup exportado', description: backupSummary(ds) })
  }

  const onFile = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      const ok = await confirm({
        title: 'Restaurar este backup?',
        description: `Backup de ${formatDate(backup.exportedAt.slice(0, 10))} com ${backupSummary(backup.data)}. Todos os dados atuais serão substituídos.`,
        confirmLabel: 'Substituir e restaurar',
        tone: 'danger',
      })
      if (!ok) return
      await restoreBackup(backup)
      toast({ title: 'Backup restaurado', description: backupSummary(backup.data) })
    } catch (err) {
      toast({ tone: 'error', title: err instanceof DomainError ? err.message : 'Não foi possível ler o arquivo.' })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Section
      title="Backup e restauração"
      description={`Seus dados ficam salvos ${STORAGE_PLACE}. Exporte backups com frequência para guardar uma cópia.`}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void onExport()}>
            Exportar backup (JSON)
          </Button>
          <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => inputRef.current?.click()}>
            Restaurar backup
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Arquivo de backup"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
            }}
          />
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-surface-2/70 px-4 py-3">
          <Database className="mt-0.5 size-4 shrink-0 text-ink-3" />
          <p className="text-[13px] text-ink-2" data-testid="storage-summary">
            <span className="font-medium text-ink">Salvos {STORAGE_PLACE}:</span> {backupSummary(ds)}
          </p>
        </div>
        {IS_DESKTOP_APP ? null : (
          <div className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-[13px] text-ink-2">
              {persisted === 'yes' ? (
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" />
              ) : (
                <HardDrive className="mt-0.5 size-4 shrink-0 text-ink-3" />
              )}
              <span>
                <span className="font-medium text-ink">Armazenamento persistente: </span>
                {persisted === 'yes'
                  ? 'ativo — o navegador não apagará os dados para liberar espaço.'
                  : persisted === 'unsupported'
                    ? 'não disponível neste navegador.'
                    : 'não garantido — o navegador pode limpar os dados se faltar espaço.'}
              </span>
            </p>
            {persisted === 'no' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const ok = await requestPersist()
                  toast(
                    ok
                      ? { title: 'Armazenamento protegido' }
                      : { tone: 'info', title: 'O navegador não concedeu a proteção', description: 'Mantenha backups em dia.' },
                  )
                }}
              >
                Proteger dados
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Section>
  )
}

function AboutSection() {
  return (
    <Section title="Sobre">
      <div className="flex items-center gap-4 p-5">
        <Logo compact />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            NEXORA · Gestão <span className="font-normal text-ink-3">versão {APP_VERSION}</span>
          </p>
          <p className="text-[13px] text-ink-3" data-testid="credit">
            {CREDIT}
          </p>
        </div>
      </div>
    </Section>
  )
}

function DangerSection() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const run = useAction()
  const valid = text.trim().toUpperCase() === 'APAGAR'
  return (
    <Section title="Zona de perigo">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Apagar todos os dados</p>
          <p className="text-[13px] text-ink-3">
            Remove clientes, vendas, recebimentos, despesas, contratos, propostas e configurações.
          </p>
        </div>
        <Button
          variant="secondary"
          className="text-bad"
          icon={<TriangleAlert className="size-4" />}
          onClick={() => setOpen(true)}
        >
          Apagar tudo
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        role="alertdialog"
        title="Apagar todos os dados?"
        description="Esta ação não pode ser desfeita. Exporte um backup antes, se quiser guardar uma cópia."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit" form="wipe-form" disabled={!valid}>
              Apagar definitivamente
            </Button>
          </>
        }
      >
        <form
          id="wipe-form"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!valid) return
            if (await run(() => repo.clearAll(), 'Todos os dados foram apagados')) {
              setText('')
              setOpen(false)
            }
          }}
        >
          <TextField label='Digite "APAGAR" para confirmar' value={text} onValueChange={setText} autoComplete="off" />
        </form>
      </Modal>
    </Section>
  )
}
