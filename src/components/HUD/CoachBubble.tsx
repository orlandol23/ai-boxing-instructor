import { Volume2 } from 'lucide-react';
import type { CoachFeedbackStatus } from '../../hooks/useCoachingFeedback';

interface CoachBubbleProps {
  status: CoachFeedbackStatus;
  feedback: string | null;
  /** Ajusta o copy de loading/fallback (fim de round vs. fim de sessão). */
  context: 'round' | 'session';
}

const LOADING_TEXT: Record<CoachBubbleProps['context'], string> = {
  round: 'Coach analisando o round...',
  session: 'Coach analisando seu treino...',
};

// Fallback amigável — nunca erro técnico cru (resiliência da Fase 5).
const UNAVAILABLE_TEXT: Record<CoachBubbleProps['context'], string> = {
  round: 'Coach IA indisponível agora — segue o treino!',
  session: 'Coach IA indisponível — confira as métricas acima.',
};

/**
 * Coach bubble do Design System v2 (SPECS §6): borda `--accent`,
 * radius 16 com canto superior esquerdo 4, bg `--surface-2` e avatar
 * `volume-2` ao lado. Texto >= 16px (text-base), PT-BR.
 */
export function CoachBubble({ status, feedback, context }: CoachBubbleProps) {
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
            {LOADING_TEXT[context]}
          </p>
        )}
        {status === 'success' && feedback && (
          <p className="whitespace-pre-line text-base leading-relaxed text-fg">{feedback}</p>
        )}
        {status === 'unavailable' && (
          <p className="text-base leading-relaxed text-fg-muted">{UNAVAILABLE_TEXT[context]}</p>
        )}
      </div>
    </div>
  );
}
