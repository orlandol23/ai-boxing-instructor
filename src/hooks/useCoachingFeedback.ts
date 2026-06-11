import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSummary } from '../engine/types';
import {
  buildCoachPayload,
  requestCoaching,
  CoachRequestError,
  COACH_TIMEOUT_MS,
  type CoachRequestType,
} from '../services/coachClient';

export type CoachFeedbackStatus = 'idle' | 'loading' | 'success' | 'unavailable';

interface UseCoachingFeedbackOptions {
  /**
   * Chamado quando um feedback chega com sucesso — usado p/ ler em voz
   * alta via Voice Coach quando o toggle de voz estiver ativo.
   */
  onFeedback?: (text: string) => void;
  /** Timeout por tentativa (default 15s). Exposto p/ testes. */
  timeoutMs?: number;
}

interface UseCoachingFeedbackReturn {
  status: CoachFeedbackStatus;
  /** Texto de coaching em PT-BR (apenas quando status === 'success'). */
  feedback: string | null;
  requestRoundFeedback: (summary: SessionSummary, roundNumber: number) => void;
  requestSessionFeedback: (summary: SessionSummary) => void;
  /** Aborta qualquer requisição em voo e volta para 'idle'. */
  clear: () => void;
}

/**
 * Hook que pede coaching da IA (POST /api/coach) ao fim de cada round
 * e/ou da sessão, a partir das métricas do SessionTracker.
 *
 * Resiliência por design: nenhuma falha do endpoint escapa deste hook —
 * qualquer erro (503 sem API key, 404 em dev local, timeout, offline)
 * vira apenas status 'unavailable', e o fluxo de treino segue intacto.
 * Requisições em voo são abortadas ao desmontar, ao limpar ou quando uma
 * nova requisição chega (a mais recente sempre vence).
 */
export function useCoachingFeedback(
  options: UseCoachingFeedbackOptions = {}
): UseCoachingFeedbackReturn {
  const [status, setStatus] = useState<CoachFeedbackStatus>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const request = useCallback(
    (type: CoachRequestType, summary: SessionSummary, roundNumber?: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setStatus('loading');
      setFeedback(null);

      void requestCoaching(buildCoachPayload(type, summary, roundNumber), {
        signal: controller.signal,
        timeoutMs: optionsRef.current.timeoutMs ?? COACH_TIMEOUT_MS,
      })
        .then((text) => {
          if (requestId !== requestIdRef.current) return;
          setStatus('success');
          setFeedback(text);
          optionsRef.current.onFeedback?.(text);
        })
        .catch((err: unknown) => {
          if (requestId !== requestIdRef.current) return;
          if (err instanceof CoachRequestError && err.reason === 'aborted') return;
          // Falha silenciosa para o treino: vira só fallback amigável no painel.
          setStatus('unavailable');
          setFeedback(null);
        });
    },
    []
  );

  const requestRoundFeedback = useCallback(
    (summary: SessionSummary, roundNumber: number) => request('round', summary, roundNumber),
    [request]
  );

  const requestSessionFeedback = useCallback(
    (summary: SessionSummary) => request('session', summary),
    [request]
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    requestIdRef.current++;
    setStatus('idle');
    setFeedback(null);
  }, []);

  // Aborta requisição em voo se o usuário sair da tela.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { status, feedback, requestRoundFeedback, requestSessionFeedback, clear };
}
