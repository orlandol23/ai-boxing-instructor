import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/coach is a public, unauthenticated endpoint: anyone can POST to it
 * and every accepted request spends model tokens. These tests pin the
 * guards that keep that affordable — the payload caps, the cross-site
 * refusal, and the order the handler applies them in (method → origin →
 * API key → body) — plus the one happy path, with the SDK mocked so the
 * suite never touches the network.
 */

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {}
  class MockAnthropic {
    static APIError = MockAPIError;
    messages = { create: createMock };
  }
  return { default: MockAnthropic };
});

import handler from '../coach';

const HOST = 'boxing.example';

interface ResponseState {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

interface FakeResponse {
  status(code: number): FakeResponse;
  json(payload: unknown): FakeResponse;
  setHeader(name: string, value: string): FakeResponse;
}

/** Minimal VercelResponse: records what the handler wrote, nothing else. */
function makeRes(): { res: VercelResponse; state: ResponseState } {
  const state: ResponseState = { statusCode: 0, body: undefined, headers: {} };
  const res: FakeResponse = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(payload) {
      state.body = payload;
      return res;
    },
    setHeader(name, value) {
      state.headers[name.toLowerCase()] = value;
      return res;
    },
  };
  return { res: res as unknown as VercelResponse, state };
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/** Minimal VercelRequest: method, headers (already parsed) and a JSON body. */
function makeReq(options: RequestOptions = {}): VercelRequest {
  return {
    method: options.method ?? 'POST',
    headers: { host: HOST, ...(options.headers ?? {}) },
    body: options.body,
  } as unknown as VercelRequest;
}

interface Summary {
  duration: number;
  rounds: number;
  totalPunches: number;
  punchBreakdown: Record<string, number>;
  avgGuardScore: number;
  avgBaseScore: number;
  corrections: string[];
  highlights: string[];
}

/** Deliberately not a phrase that appears in either system prompt. */
const CORRECTION = 'Elbow drifted out on the lead hook (7x)';

function makeSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    duration: 180_000,
    rounds: 2,
    totalPunches: 42,
    punchBreakdown: {
      jab: 24,
      cross: 12,
      lead_hook: 6,
      rear_hook: 0,
      lead_uppercut: 0,
      rear_uppercut: 0,
    },
    avgGuardScore: 78.4,
    avgBaseScore: 84.9,
    corrections: [CORRECTION],
    highlights: [],
    ...overrides,
  };
}

function makeBody(summary: Partial<Summary> = {}): Record<string, unknown> {
  return { type: 'round', roundNumber: 2, locale: 'en', summary: makeSummary(summary) };
}

interface CreateParams {
  system: { type: string; text: string; cache_control?: { type: string } }[];
  messages: { role: string; content: string }[];
}

function lastCreateParams(): CreateParams {
  const call = createMock.mock.calls.at(-1);
  expect(call).toBeDefined();
  return (call as unknown[])[0] as CreateParams;
}

function mockCoaching(text: string): void {
  createMock.mockResolvedValue({
    content: [{ type: 'text', text }],
    usage: {
      input_tokens: 120,
      output_tokens: 60,
      cache_creation_input_tokens: 900,
      cache_read_input_tokens: 0,
    },
  });
}

const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  createMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
});

describe('POST /api/coach — método', () => {
  it('responde 405 com Allow: POST para GET', async () => {
    const { res, state } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);

    expect(state.statusCode).toBe(405);
    expect(state.body).toEqual({ error: 'method_not_allowed' });
    expect(state.headers.allow).toBe('POST');
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/coach — origem', () => {
  it('recusa chamada marcada como cross-site pelo browser', async () => {
    const { res, state } = makeRes();
    await handler(
      makeReq({ headers: { 'sec-fetch-site': 'cross-site' }, body: makeBody() }),
      res
    );

    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'forbidden_origin' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('recusa Origin de outro host', async () => {
    const { res, state } = makeRes();
    await handler(
      makeReq({ headers: { origin: 'https://evil.example' }, body: makeBody() }),
      res
    );

    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'forbidden_origin' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('a checagem de origem vem antes da checagem de chave', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { res, state } = makeRes();
    await handler(
      makeReq({ headers: { 'sec-fetch-site': 'cross-site' }, body: makeBody() }),
      res
    );

    expect(state.statusCode).toBe(403);
  });

  it('aceita Origin do mesmo host (same-origin fetch)', async () => {
    mockCoaching('Guarda alta, bom round.');
    const { res, state } = makeRes();
    await handler(
      makeReq({
        headers: { origin: `https://${HOST}`, 'sec-fetch-site': 'same-origin' },
        body: makeBody(),
      }),
      res
    );

    expect(state.statusCode).toBe(200);
  });

  it('aceita requisição sem Origin (curl, browsers antigos)', async () => {
    mockCoaching('Bom trabalho.');
    const { res, state } = makeRes();
    await handler(makeReq({ body: makeBody() }), res);

    expect(state.statusCode).toBe(200);
  });
});

describe('POST /api/coach — sem ANTHROPIC_API_KEY', () => {
  it('responde 503 e não chama a API', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { res, state } = makeRes();
    await handler(makeReq({ body: makeBody() }), res);

    expect(state.statusCode).toBe(503);
    expect(state.body).toMatchObject({ error: 'coaching_unavailable' });
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/coach — validação do corpo', () => {
  async function expectInvalid(body: unknown): Promise<void> {
    const { res, state } = makeRes();
    await handler(makeReq({ body }), res);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'invalid_body' });
    expect(createMock).not.toHaveBeenCalled();
  }

  it('recusa mais de 20 correções', async () => {
    await expectInvalid(makeBody({ corrections: Array<string>(21).fill('guarda baixa') }));
  });

  it('recusa uma nota acima de 200 caracteres', async () => {
    await expectInvalid(makeBody({ highlights: ['x'.repeat(201)] }));
  });

  it('recusa score acima de 100', async () => {
    await expectInvalid(makeBody({ avgGuardScore: 101 }));
  });

  it('recusa duração acima de 4h', async () => {
    await expectInvalid(makeBody({ duration: 4 * 60 * 60 * 1000 + 1 }));
  });

  it('recusa contagem de golpes fora de escala', async () => {
    await expectInvalid(
      makeBody({ punchBreakdown: { ...makeSummary().punchBreakdown, jab: 10_001 } })
    );
  });

  it('aceita o limite exato (20 notas de 200 caracteres)', async () => {
    mockCoaching('Round sólido.');
    const { res, state } = makeRes();
    await handler(
      makeReq({ body: makeBody({ corrections: Array<string>(20).fill('n'.repeat(200)) }) }),
      res
    );

    expect(state.statusCode).toBe(200);
  });
});

describe('POST /api/coach — caminho feliz', () => {
  it('responde 200 com o texto do coach', async () => {
    mockCoaching('Round consistente, base firme.');
    const { res, state } = makeRes();
    await handler(makeReq({ body: makeBody() }), res);

    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({ coaching: 'Round consistente, base firme.' });
  });

  it('marca o system prompt com cache_control ephemeral', async () => {
    mockCoaching('Bom round.');
    const { res } = makeRes();
    await handler(makeReq({ body: makeBody() }), res);

    const params = lastCreateParams();
    expect(params.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(params.system[0].type).toBe('text');
  });

  it('manda as correções no user message, não no system prompt', async () => {
    mockCoaching('Bom round.');
    const { res } = makeRes();
    await handler(makeReq({ body: makeBody() }), res);

    const params = lastCreateParams();
    expect(params.messages[0].role).toBe('user');
    expect(params.messages[0].content).toContain(CORRECTION);
    expect(params.system[0].text).not.toContain(CORRECTION);
  });
});
