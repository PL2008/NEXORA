import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.warn('Erro na interface', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    const storage = /indexeddb|database|dexie/i.test(`${this.state.error.name} ${this.state.error.message}`)
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-ink">Algo não saiu como esperado</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">
            {storage
              ? 'Não foi possível acessar o armazenamento local do navegador. Verifique se o navegador não está em modo privado com armazenamento bloqueado.'
              : 'Recarregue a página. Seus dados continuam salvos neste navegador.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 h-9 rounded-lg bg-ink px-4 text-sm font-medium text-inverse"
          >
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
