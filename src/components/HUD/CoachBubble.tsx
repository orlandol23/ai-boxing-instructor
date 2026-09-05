import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CoachFeedbackStatus } from '../../hooks/useCoachingFeedback';

interface CoachBubbleProps {
  status: CoachFeedbackStatus;
  feedback: string | null;
  /** Tunes the loading/fallback copy (end of round vs. end of session). */
  context: 'round' | 'session';
}

const LOADING_KEYS: Record<CoachBubbleProps['context'], string> = {
  round: 'coach.loadingRound',
  session: 'coach.loadingSession',
};

// Friendly fallback, never a raw technical error (Phase 5 resilience).
const UNAVAILABLE_KEYS: Record<CoachBubbleProps['context'], string> = {
  round: 'coach.unavailableRound',
  session: 'coach.unavailableSession',
};

/**
 * Design System v2 coach bubble (SPECS §6): `--accent` border, radius 16
 * with a top-left corner of 4, `--surface-2` background and a `volume-2`
 * avatar alongside. Text >= 16px (text-base), in the active language.
 */
export function CoachBubble({ status, feedback, context }: CoachBubbleProps) {
  const { t } = useTranslation();

  if (status === 'idle') return null;

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent bg-surface-2 text-accent"
        aria-hidden="true"
      >
        <Volume2 size={20} />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="min-w-0 flex-1 rounded-[16px] rounded-tl-[4px] border border-accent bg-surface-2 px-4 py-3"
      >
        {status === 'loading' && (
          <p className="animate-pulse text-base leading-relaxed text-fg-muted">
            {t(LOADING_KEYS[context])}
          </p>
        )}
        {status === 'success' && feedback && (
          <p className="whitespace-pre-line text-base leading-relaxed text-fg">{feedback}</p>
        )}
        {status === 'unavailable' && (
          <p className="text-base leading-relaxed text-fg-muted">{t(UNAVAILABLE_KEYS[context])}</p>
        )}
      </div>
    </div>
  );
}
