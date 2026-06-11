import type { PunchType, SessionSummary } from '../engine/types';

/**
 * Cliente do endpoint POST /api/coach (Vercel Function, Fase 4).
 *
 * Mantido como módulo puro (sem React) para ser trivialmente testável:
 * o hook useCoachingFeedback é só um wrapper de estado em cima disto.
 */

export type CoachRequestType = 'round' | 'session';

export interface CoachPayload {
  type: CoachRequestType;
  summary: {
    duration: number;
    rounds: number;
    totalPunches: number;
    punchBreakdown: Record<PunchType, number>;
    avgGuardScore: number;
    avgBaseScore: number;
    corrections: string[];
    highlights: string[];
  };
  roundNumber?: number;
}

export type CoachErrorReason =
  /** Endpoint respondeu mas o coach não está disponível (503 sem API key, 404/405 em dev local sem backend). */
  | 'unavailable'
  /** A requisição estourou o timeout local. */
  | 'timeout'
  /** Falha de rede (offline, DNS, conexão recusada). */
  | 'network'
  /** Resposta HTTP inesperada ou corpo inválido. */
  | 'http'
  /** Abortada pelo chamador (unmount, nova requisição, clear). */
  | 'aborted';

export class CoachRequestError extends Error {
  readonly reason: CoachErrorReason;
  readonly status?: number;

  constructor(message: string, reason: CoachErrorReason, status?: number) {
    super(message);
    this.name = 'CoachRequestError';
    this.reason = reason;
    this.status = status;
  }
}

export const COACH_ENDPOINT = '/api/coach';
export const COACH_TIMEOUT_MS = 15_000;
/** Máximo de 1 retry (total de 2 tentativas) — nada de retry agressivo. */
export const COACH_MAX_RETRIES = 1;

const PUNCH_TYPES: PunchType[] = [
  'jab',
  'cross',
  'lead_hook',
  'rear_hook',
  'lead_uppercut',
  'rear_uppercut',
];

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Monta o corpo da requisição a partir do SessionSummary do SessionTracker,
 * saneando os números para o shape que a validação do api/coach.ts exige
 * (todos finitos e >= 0; roundNumber só em coaching de round).
 */
export function buildCoachPayload(
  type: CoachRequestType,
  summary: SessionSummary,
  roundNumber?: number
): CoachPayload {
  const punchBreakdown = {} as Record<PunchType, number>;
  for (const punchType of PUNCH_TYPES) {
    punchBreakdown[punchType] = nonNegative(summary.punchBreakdown[punchType] ?? 0);
  }

  const payload: CoachPayload = {
    type,
    summary: {
      duration: nonNegative(summary.duration),
      rounds: nonNegative(summary.rounds),
      totalPunches: nonNegative(summary.totalPunches),
      punchBreakdown,
      avgGuardScore: nonNegative(summary.avgGuardScore),
      avgBaseScore: nonNegative(summary.avgBaseScore),
      corrections: [...summary.corrections],
      highlights: [...summary.highlights],
    },
  };

  if (type === 'round' && roundNumber !== undefined) {
    payload.roundNumber = nonNegative(roundNumber);
  }

  return payload;
}

export interface RequestCoachingOptions {
  /** Sinal externo para abortar (unmount / nova requisição). */
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  /** Injetável para testes. */
  fetchFn?: typeof fetch;
  endpoint?: string;
}

function isRetryable(error: CoachRequestError): boolean {
  if (error.reason === 'network' || error.reason === 'timeout') return true;
  if (error.reason === 'http' && error.status !== undefined && error.status >= 500) return true;
  return false;
}

/**
 * Envia o payload para /api/coach e devolve o texto de coaching.
 *
 * Nunca lança nada além de CoachRequestError. Faz no máximo `retries`
 * novas tentativas (default 1), e só para falhas transitórias —
 * 503/404 (coach indisponível) e aborts falham imediatamente.
 */
export async function requestCoaching(
  payload: CoachPayload,
  options: RequestCoachingOptions = {}
): Promise<string> {
  const {
    signal,
    timeoutMs = COACH_TIMEOUT_MS,
    retries = COACH_MAX_RETRIES,
    fetchFn,
    endpoint = COACH_ENDPOINT,
  } = options;

  const attempts = Math.max(1, retries + 1);
  let lastError = new CoachRequestError('coach request failed', 'network');

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await attemptRequest(payload, { signal, timeoutMs, fetchFn, endpoint });
    } catch (err) {
      lastError =
        err instanceof CoachRequestError
          ? err
          : new CoachRequestError(err instanceof Error ? err.message : String(err), 'network');
      if (!isRetryable(lastError)) throw lastError;
    }
  }

  throw lastError;
}

async function attemptRequest(
  payload: CoachPayload,
  opts: {
    signal?: AbortSignal;
    timeoutMs: number;
    fetchFn?: typeof fetch;
    endpoint: string;
  }
): Promise<string> {
  const { signal, timeoutMs, endpoint } = opts;
  const fetchFn = opts.fetchFn ?? fetch;

  if (signal?.aborted) {
    throw new CoachRequestError('coach request aborted', 'aborted');
  }

  const controller = new AbortController();
  let timedOut = false;
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      if (timedOut) {
        throw new CoachRequestError(`coach request timed out after ${timeoutMs}ms`, 'timeout');
      }
      if (signal?.aborted) {
        throw new CoachRequestError('coach request aborted', 'aborted');
      }
      throw new CoachRequestError(
        err instanceof Error ? err.message : 'network error',
        'network'
      );
    }

    if (!response.ok) {
      // 503 = ANTHROPIC_API_KEY ausente no servidor (degradação prevista);
      // 404/405 = dev local sem as Vercel Functions (ex.: `vite dev` puro).
      if (response.status === 503 || response.status === 404 || response.status === 405) {
        throw new CoachRequestError(
          `coach unavailable (HTTP ${response.status})`,
          'unavailable',
          response.status
        );
      }
      throw new CoachRequestError(
        `coach request failed (HTTP ${response.status})`,
        'http',
        response.status
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new CoachRequestError('invalid JSON from /api/coach', 'http', response.status);
    }

    const coaching =
      data && typeof data === 'object' ? (data as { coaching?: unknown }).coaching : undefined;
    if (typeof coaching !== 'string' || coaching.trim() === '') {
      throw new CoachRequestError('empty coaching in /api/coach response', 'http', response.status);
    }

    return coaching.trim();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
