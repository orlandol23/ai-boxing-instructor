import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { withTranslation, type WithTranslation } from 'react-i18next';

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary for the training area: it catches rendering errors
 * (camera, MediaPipe, canvas) and shows a friendly screen instead of
 * taking the whole app down.
 *
 * Class component, so it gets `t` via the `withTranslation` HOC rather
 * than a hook (exported as `ErrorBoundary` at the bottom of the file).
 */
class ErrorBoundaryBase extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by the ErrorBoundary:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { t } = this.props;

    return (
      <div className="flex flex-1 items-center justify-center bg-bg p-4">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6 text-center">
          <span className="text-4xl" role="img" aria-label={t('error.gloveAlt')}>
            🥊
          </span>
          <h2 className="font-display text-title font-bold uppercase tracking-wide text-accent">
            {t('error.title')}
          </h2>
          <p className="text-sm text-fg-muted">{t('error.message')}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 font-display text-lg font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t('error.reload')}
          </button>
        </div>
      </div>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
