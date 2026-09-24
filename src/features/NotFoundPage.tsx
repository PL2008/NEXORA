import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass />}
      title="Página não encontrada"
      description="O endereço acessado não existe no sistema."
      action={
        <Link to="/" className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-inverse">
          Ir para a visão geral
        </Link>
      }
    />
  )
}
