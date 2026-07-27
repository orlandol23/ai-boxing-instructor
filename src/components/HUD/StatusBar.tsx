import { CameraOff, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TextNote } from '../../i18n/types';

interface StatusBarProps {
  isModelLoading: boolean;
  hasLandmarks: boolean;
  /** i18n key + params — the camera hook stays language-free. */
  cameraError: TextNote | null;
  poseError: TextNote | null;
  isCameraReady?: boolean;
}

/**
 * Estados de loading/erro do treino (SPECS §6 — Estados):
 * - erro de câmera/modelo: tela cheia com ícone + CTA (nunca toast)
 * - carregando modelo: overlay total + spinner accent
 * - sem pose detectada: faixa inferior em --overlay, texto warn 16px
 */
export function StatusBar({
  isModelLoading,
  hasLandmarks,
  cameraError,
  poseError,
  isCameraReady = false,
}: StatusBarProps) {
  const { t } = useTranslation();
  const error = cameraError || poseError;

  if (error) {
    const Icon = cameraError ? CameraOff : AlertTriangle;
    const title = cameraError ? t('status.cameraBlocked') : t('status.startFailed');

    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-bg px-8 text-center">
        <Icon size={48} className="text-score-bad" aria-hidden="true" />
        <h2 className="font-display text-title font-bold uppercase tracking-wide text-fg">
          {title}
        </h2>
        <p className="max-w-sm text-base leading-relaxed text-fg-muted">
          {t(error.key, error.params)}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 flex items-center justify-center rounded-xl border border-line-strong bg-surface-2 px-7 font-display text-lg font-bold uppercase tracking-wider text-fg transition-[border-color,transform] hover:border-accent active:scale-[.96]"
        >
          {t('status.retry')}
        </button>
      </div>
    );
  }

  if (isModelLoading) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-overlay backdrop-blur-xs">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-accent-light">
          {t('status.loadingModel')}
        </p>
      </div>
    );
  }

  if (!hasLandmarks && isCameraReady) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-10 bg-overlay px-4 py-3 text-center text-base font-semibold text-score-warn backdrop-blur-xs">
        {t('status.stepIntoFrame')}
      </div>
    );
  }

  return null;
}
