import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
   * Called whenever feedback arrives successfully. Used to read it out
   * loud through the Voice Coach when the voice toggle is on.
   */
  onFeedback?: (text: string) => void;
  /** Timeout per attempt (default 15s). Exposed for tests. */
  timeoutMs?: number;
}

interface UseCoachingFeedbackReturn {
  status: CoachFeedbackStatus;
  /** Coaching text in the active language (only when status === 'success'). */
  feedback: string | null;
  requestRoundFeedback: (summary: SessionSummary, roundNumber: number) => void;
  requestSessionFeedback: (summary: SessionSummary) => void;
  /** Aborts any in-flight request and goes back to 'idle'. */
  clear: () => void;
}

/**
 * Hook that asks the AI for coaching (POST /api/coach) at the end of every
 * round and/or session, from the SessionTracker's metrics.
 *
 * Resilient by design: no endpoint failure escapes this hook. Any error
 * (503 with no API key, 404 in local dev, timeout, offline) becomes the
 * 'unavailable' status and nothing else, and the training flow carries on
 * intact. In-flight requests are aborted on unmount, on clear, or when a
 * new request arrives (the most recent one always wins).
 *
 * The active language travels in the payload (`locale`), and the engine's
 * structured notes are translated here before they reach the AI, so the
 * coach answers in the same language as the interface.
 */
export function useCoachingFeedback(
  options: UseCoachingFeedbackOptions = {}
): UseCoachingFeedbackReturn {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<CoachFeedbackStatus>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // `request` is a stable callback, so the active language is read through
  // a ref: switching EN/PT never re-creates it (and never re-fires it).
  const i18nRef = useRef({ t, language: i18n.resolvedLanguage ?? i18n.language });
  useEffect(() => {
    i18nRef.current = { t, language: i18n.resolvedLanguage ?? i18n.language };
  });

  const request = useCallback(
    (type: CoachRequestType, summary: SessionSummary, roundNumber?: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setStatus('loading');
      setFeedback(null);

      const payload = buildCoachPayload(type, summary, {
        roundNumber,
        locale: i18nRef.current.language,
        translate: (key, params) => i18nRef.current.t(key, params ?? {}),
      });

      void requestCoaching(payload, {
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
          // Silent failure for the workout: it only becomes a friendly panel fallback.
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

  // Abort an in-flight request if the user leaves the screen.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { status, feedback, requestRoundFeedback, requestSessionFeedback, clear };
}
