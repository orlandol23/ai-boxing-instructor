import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary para a área de treino: captura erros de renderização
 * (câmera, MediaPipe, canvas) e mostra uma tela amigável em vez de
 * derrubar o app inteiro.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex flex-1 items-center justify-center bg-boxing-dark p-4">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-boxing-border bg-boxing-card p-6 text-center">
          <span className="text-4xl" role="img" aria-label="Luva de boxe">
            🥊
          </span>
          <h2 className="font-display text-xl font-bold text-boxing-gold">
            Ops, algo deu errado
          </h2>
          <p className="text-sm text-gray-400">
            Encontramos um problema inesperado durante o treino. Recarregue a
            página para continuar — seu progresso de hoje não some, é só
            recomeçar o round.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-2 rounded-xl bg-boxing-red px-5 py-2.5 font-semibold text-white transition-colors hover:bg-boxing-red-light"
          >
            <RotateCcw size={18} aria-hidden="true" />
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
