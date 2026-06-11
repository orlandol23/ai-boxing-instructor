// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCoachingFeedback } from '../useCoachingFeedback';
import type { SessionSummary } from '../../engine/types';

function makeSummary(): SessionSummary {
  return {
    duration: 180_000,
    rounds: 1,
    totalPunches: 12,
    punchBreakdown: {
      jab: 8,
      cross: 4,
      lead_hook: 0,
      rear_hook: 0,
      lead_uppercut: 0,
      rear_uppercut: 0,
    },
    avgGuardScore: 82,
    avgBaseScore: 79,
    corrections: [],
    highlights: [],
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useCoachingFeedback', () => {
  it('sucesso: loading -> success com o texto do coach e callback de voz', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { coaching: 'Round forte!' }));
    vi.stubGlobal('fetch', fetchMock);
    const onFeedback = vi.fn();

    const { result } = renderHook(() => useCoachingFeedback({ onFeedback }));
    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.requestRoundFeedback(makeSummary(), 1);
    });
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.feedback).toBe('Round forte!');
    expect(onFeedback).toHaveBeenCalledWith('Round forte!');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/coach');
    const body = JSON.parse(init.body as string);
    expect(body.type).toBe('round');
    expect(body.roundNumber).toBe(1);
  });

  it('503 (sem API key) vira "unavailable" sem expor erro técnico', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(503, { error: 'coaching_unavailable' }));
    vi.stubGlobal('fetch', fetchMock);
    const onFeedback = vi.fn();

    const { result } = renderHook(() => useCoachingFeedback({ onFeedback }));
    act(() => {
      result.current.requestSessionFeedback(makeSummary());
    });

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(result.current.feedback).toBeNull();
    expect(onFeedback).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1); // 503 não tem retry
  });

  it('timeout vira "unavailable" (com no máximo 1 retry)', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCoachingFeedback({ timeoutMs: 20 }));
    act(() => {
      result.current.requestRoundFeedback(makeSummary(), 1);
    });
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('unavailable'), { timeout: 2000 });
    expect(fetchMock).toHaveBeenCalledTimes(2); // tentativa + 1 retry
  });

  it('erro de rede (dev local sem backend) degrada para "unavailable"', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCoachingFeedback());
    act(() => {
      result.current.requestSessionFeedback(makeSummary());
    });

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborta a requisição em voo quando o componente desmonta', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_, reject) => {
          capturedSignal = init.signal ?? undefined;
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() => useCoachingFeedback());
    act(() => {
      result.current.requestRoundFeedback(makeSummary(), 1);
    });
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('clear() aborta e volta para "idle"', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCoachingFeedback());
    act(() => {
      result.current.requestRoundFeedback(makeSummary(), 1);
    });
    expect(result.current.status).toBe('loading');

    act(() => {
      result.current.clear();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.feedback).toBeNull();

    // estado permanece idle (o catch da requisição abortada não vaza)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.status).toBe('idle');
  });
});
