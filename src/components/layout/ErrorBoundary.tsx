import { Component, type ReactNode } from 'react'

/** Captura erros inesperados de renderização. Não envia nada para serviços externos. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="font-serif text-2xl">Algo não saiu como esperado.</p>
          <p className="mt-2 text-muted-foreground">Seus dados estão seguros. Recarregue a página para continuar.</p>
          <button onClick={() => location.reload()} className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Recarregar</button>
        </div>
      </div>
    )
  }
}
