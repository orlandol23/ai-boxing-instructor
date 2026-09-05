import type { PunchType, SessionSummary, SummaryNote } from '../engine/types';

/**
 * Client for the POST /api/coach endpoint (Vercel Function, Phase 4).
 *
 * Kept as a pure module (no React) so it is trivially testable: the
 * useCoachingFeedback hook is just a state wrapper on top of this.
 */

export type CoachRequestType = 'round' | 'session';

/** Locales the coaching endpoint accepts. Mirrors api/coach.ts. */
export const COACH_LOCALES = ['en', 'pt-BR'] as const;
export type CoachLocale = (typeof COACH_LOCALES)[number];
export const DEFAULT_COACH_LOCALE: CoachLocale = 'en';

/**
 * Narrows a UI language to a locale the endpoint understands. The server
 * validates again — this just avoids sending obvious junk over the wire.
 */
export function normalizeCoachLocale(value: string | null | undefined): CoachLocale {
  return typeof value === 'string' && (COACH_LOCALES as readonly string[]).includes(value)
    ? (value as CoachLocale)
    : DEFAULT_COACH_LOCALE;
}

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
  /** Language the coaching message should come back in. */
  locale: CoachLocale;
}

export type CoachErrorReason =
  /** The endpoint answered but the coach is unavailable (503 with no API key, 404/405 in local dev with no backend). */
  | 'unavailable'
  /** The request blew the local timeout. */
  | 'timeout'
  /** Network failure (offline, DNS, connection refused). */
  | 'network'
  /** Unexpected HTTP response or invalid body. */
  | 'http'
  /** Aborted by the caller (unmount, new request, clear). */
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
/** At most 1 retry (2 attempts in total). No aggressive retrying. */
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

/** Renders an engine note (i18n key + params) into prose for the model. */
export type NoteTranslator = (key: string, params?: Record<string, string | number>) => string;

/** Last-resort renderer: the key itself. Callers should pass i18next's `t`. */
const identityTranslator: NoteTranslator = (key) => key;

export interface BuildCoachPayloadOptions {
  /** Only meaningful for `type === 'round'`. */
  roundNumber?: number;
  /** UI language; normalised before it goes on the wire. */
  locale?: string;
  /**
   * Turns the engine's `{ key, params }` notes into sentences. The engine
   * is language-free, so the payload is localised at this boundary — the
   * model then reasons over prose in the same language it must answer in.
   */
  translate?: NoteTranslator;
}

/**
 * Builds the request body from the SessionTracker's SessionSummary,
 * sanitising the numbers into the shape api/coach.ts validation demands
 * (all finite and >= 0; roundNumber only for round coaching).
 */
export function buildCoachPayload(
  type: CoachRequestType,
  summary: SessionSummary,
  options: BuildCoachPayloadOptions = {}
): CoachPayload {
  const { roundNumber, locale, translate = identityTranslator } = options;

  const punchBreakdown = {} as Record<PunchType, number>;
  for (const punchType of PUNCH_TYPES) {
    punchBreakdown[punchType] = nonNegative(summary.punchBreakdown[punchType] ?? 0);
  }

  const render = (note: SummaryNote) => translate(note.key, note.params);

  const payload: CoachPayload = {
    type,
    summary: {
      duration: nonNegative(summary.duration),
      rounds: nonNegative(summary.rounds),
      totalPunches: nonNegative(summary.totalPunches),
      punchBreakdown,
      avgGuardScore: nonNegative(summary.avgGuardScore),
      avgBaseScore: nonNegative(summary.avgBaseScore),
      corrections: summary.corrections.map(render),
      highlights: summary.highlights.map(render),
    },
    locale: normalizeCoachLocale(locale),
  };

  if (type === 'round' && roundNumber !== undefined) {
    payload.roundNumber = nonNegative(roundNumber);
  }

  return payload;
}

export interface RequestCoachingOptions {
  /** External abort signal (unmount / new request). */
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
  endpoint?: string;
}

function isRetryable(error: CoachRequestError): boolean {
  if (error.reason === 'network' || error.reason === 'timeout') return true;
  if (error.reason === 'http' && error.status !== undefined && error.status >= 500) return true;
  return false;
}

/**
 * Sends the payload to /api/coach and returns the coaching text.
 *
 * Never throws anything other than a CoachRequestError. It makes at most
 * `retries` further attempts (default 1), and only for transient failures:
 * 503/404 (coach unavailable) and aborts fail immediately.
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
      // 503 = ANTHROPIC_API_KEY missing on the server (planned degradation);
      // 404/405 = local dev with no Vercel Functions (e.g. plain `vite dev`).
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
