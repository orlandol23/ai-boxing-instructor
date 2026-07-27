import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCoachPayload,
  requestCoaching,
  normalizeCoachLocale,
  CoachRequestError,
  COACH_ENDPOINT,
  DEFAULT_COACH_LOCALE,
} from '../coachClient';
import { SessionTracker } from '../../engine/SessionTracker';
import type { SessionSummary } from '../../engine/types';
import {
  makeBase,
  makeFrame,
  makeGuard,
  makePunch,
} from '../../engine/__tests__/fixtures';

function makeSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    duration: 180_000,
    rounds: 2,
    totalPunches: 30,
    punchBreakdown: {
      jab: 18,
      cross: 10,
      lead_hook: 2,
      rear_hook: 0,
      lead_uppercut: 0,
      rear_uppercut: 0,
    },
    avgGuardScore: 78.4,
    avgBaseScore: 84.9,
    corrections: [{ key: 'notes.correction.guardHandHeight', params: { count: 4 } }],
    highlights: [
      { key: 'notes.highlight.highScoreStreak', params: { round: 1, seconds: 10 } },
    ],
    ...overrides,
  };
}

/** Stand-in for i18next's `t`: renders a note as `key(param=value,…)`. */
function fakeTranslate(key: string, params?: Record<string, string | number>): string {
  const suffix = params
    ? `(${Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(',')})`
    : '';
  return `${key}${suffix}`;
}

type FetchResponse = Pick<Response, 'ok' | 'status'> & { json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): FetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function asFetch(fn: unknown): typeof fetch {
  return fn as typeof fetch;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('buildCoachPayload', () => {
  it('monta payload de sessão sem roundNumber', () => {
    const payload = buildCoachPayload('session', makeSummary(), {
      translate: fakeTranslate,
    });

    expect(payload.type).toBe('session');
    expect(payload.roundNumber).toBeUndefined();
    expect(payload.summary.duration).toBe(180_000);
    expect(payload.summary.totalPunches).toBe(30);
    expect(payload.summary.punchBreakdown.jab).toBe(18);
    expect(payload.summary.corrections).toEqual([
      'notes.correction.guardHandHeight(count=4)',
    ]);
    expect(payload.summary.highlights).toEqual([
      'notes.highlight.highScoreStreak(round=1,seconds=10)',
    ]);
  });

  it('monta payload de round com roundNumber', () => {
    const payload = buildCoachPayload('round', makeSummary(), { roundNumber: 2 });
    expect(payload.type).toBe('round');
    expect(payload.roundNumber).toBe(2);
  });

  it('traduz as notas do engine no limite da rede (a IA nunca vê chaves)', () => {
    const payload = buildCoachPayload('session', makeSummary(), {
      translate: (key) => (key.includes('guardHandHeight') ? 'Hands dropped' : 'Nice streak'),
    });
    expect(payload.summary.corrections).toEqual(['Hands dropped']);
    expect(payload.summary.highlights).toEqual(['Nice streak']);
  });

  it('saneia valores negativos/não-finitos para 0 (validação do api/coach)', () => {
    const payload = buildCoachPayload(
      'session',
      makeSummary({
        duration: -50,
        avgGuardScore: Number.NaN,
        punchBreakdown: {
          jab: -1,
          cross: Number.POSITIVE_INFINITY,
          lead_hook: 3,
          rear_hook: 0,
          lead_uppercut: 0,
          rear_uppercut: 0,
        },
      })
    );

    expect(payload.summary.duration).toBe(0);
    expect(payload.summary.avgGuardScore).toBe(0);
    expect(payload.summary.punchBreakdown.jab).toBe(0);
    expect(payload.summary.punchBreakdown.cross).toBe(0);
    expect(payload.summary.punchBreakdown.lead_hook).toBe(3);
  });

  it('copia arrays do summary (mutações posteriores não vazam pro payload)', () => {
    const summary = makeSummary();
    const payload = buildCoachPayload('session', summary, { translate: fakeTranslate });
    summary.corrections.push({ key: 'notes.correction.generic', params: { count: 1 } });
    expect(payload.summary.corrections).toHaveLength(1);
  });

  describe('locale', () => {
    it('vai no corpo da requisição, saneado', () => {
      expect(buildCoachPayload('session', makeSummary(), { locale: 'pt-BR' }).locale).toBe(
        'pt-BR'
      );
      expect(buildCoachPayload('session', makeSummary(), { locale: 'en' }).locale).toBe('en');
    });

    it('idioma ausente ou desconhecido cai no default (nunca vaza pro prompt)', () => {
      expect(buildCoachPayload('session', makeSummary()).locale).toBe(DEFAULT_COACH_LOCALE);
      expect(
        buildCoachPayload('session', makeSummary(), { locale: 'pt' }).locale
      ).toBe(DEFAULT_COACH_LOCALE);
      expect(
        buildCoachPayload('session', makeSummary(), { locale: 'de-DE' }).locale
      ).toBe(DEFAULT_COACH_LOCALE);
    });

    it('normalizeCoachLocale aceita só a allow-list', () => {
      expect(normalizeCoachLocale('en')).toBe('en');
      expect(normalizeCoachLocale('pt-BR')).toBe('pt-BR');
      expect(normalizeCoachLocale('PT-br')).toBe('en');
      expect(normalizeCoachLocale('')).toBe('en');
      expect(normalizeCoachLocale(null)).toBe('en');
      expect(normalizeCoachLocale(undefined)).toBe('en');
    });
  });

  it('formata as métricas acumuladas por um SessionTracker real', () => {
    const tracker = new SessionTracker();
    tracker.startSession(0);
    tracker.startRound(0);
    tracker.recordFrame(
      makeFrame({
        timestamp: 100,
        guard: makeGuard({ overall: 90 }),
        base: makeBase({ overall: 70 }),
        activePunch: makePunch({ type: 'jab', timestamp: 100 }),
      })
    );
    tracker.recordFrame(
      makeFrame({
        timestamp: 200,
        guard: makeGuard({ overall: 80 }),
        base: makeBase({ overall: 90 }),
        activePunch: makePunch({ type: 'cross', timestamp: 200 }),
      })
    );
    const summary = tracker.endSession(180_000);

    const payload = buildCoachPayload('round', summary, {
      roundNumber: 1,
      translate: fakeTranslate,
    });

    expect(payload.roundNumber).toBe(1);
    expect(payload.summary.rounds).toBe(1);
    expect(payload.summary.duration).toBe(180_000);
    expect(payload.summary.totalPunches).toBe(2);
    expect(payload.summary.punchBreakdown).toEqual({
      jab: 1,
      cross: 1,
      lead_hook: 0,
      rear_hook: 0,
      lead_uppercut: 0,
      rear_uppercut: 0,
    });
    expect(payload.summary.avgGuardScore).toBe(85);
    expect(payload.summary.avgBaseScore).toBe(80);

    // Tudo que o api/coach valida como número precisa ser finito e >= 0.
    const numeric = [
      payload.summary.duration,
      payload.summary.rounds,
      payload.summary.totalPunches,
      payload.summary.avgGuardScore,
      payload.summary.avgBaseScore,
      ...Object.values(payload.summary.punchBreakdown),
    ];
    for (const n of numeric) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('requestCoaching', () => {
  const payload = buildCoachPayload('round', makeSummary(), {
    roundNumber: 1,
    translate: fakeTranslate,
  });

  it('devolve o texto de coaching no sucesso (uma única chamada)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { coaching: ' Round bom! ' }));

    const result = await requestCoaching(payload, { fetchFn: asFetch(fetchFn) });

    expect(result).toBe('Round bom!');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(COACH_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('503 (sem ANTHROPIC_API_KEY) vira "unavailable" sem retry', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(503, { error: 'coaching_unavailable' }));

    await expect(requestCoaching(payload, { fetchFn: asFetch(fetchFn) })).rejects.toMatchObject({
      name: 'CoachRequestError',
      reason: 'unavailable',
      status: 503,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('404 (dev local sem backend) vira "unavailable" sem retry', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(404, {}));

    await expect(requestCoaching(payload, { fetchFn: asFetch(fetchFn) })).rejects.toMatchObject({
      reason: 'unavailable',
      status: 404,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('erro de rede tem no máximo 1 retry e depois falha como "network"', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(requestCoaching(payload, { fetchFn: asFetch(fetchFn) })).rejects.toMatchObject({
      reason: 'network',
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('recupera no retry após uma falha de rede transitória', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(200, { coaching: 'Boa!' }));

    await expect(requestCoaching(payload, { fetchFn: asFetch(fetchFn) })).resolves.toBe('Boa!');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aborta por timeout local e classifica como "timeout"', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );

    const promise = requestCoaching(payload, {
      fetchFn: asFetch(fetchFn),
      timeoutMs: 100,
      retries: 0,
    });
    const assertion = expect(promise).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(150);
    await assertion;
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('abort externo (usuário saiu) vira "aborted" sem retry', async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );

    const promise = requestCoaching(payload, {
      fetchFn: asFetch(fetchFn),
      signal: controller.signal,
    });
    const assertion = expect(promise).rejects.toMatchObject({ reason: 'aborted' });
    controller.abort();
    await assertion;
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('resposta sem campo coaching vira erro "http"', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { coaching: '' }));

    await expect(
      requestCoaching(payload, { fetchFn: asFetch(fetchFn) })
    ).rejects.toBeInstanceOf(CoachRequestError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
