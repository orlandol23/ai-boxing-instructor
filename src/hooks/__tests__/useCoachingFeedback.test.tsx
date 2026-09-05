// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCoachingFeedback } from '../useCoachingFeedback';
import type { SessionSummary } from '../../engine/types';
import i18n, { DEFAULT_LOCALE } from '../../i18n';

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
    corrections: [{ key: 'notes.correction.guardHandHeight', params: { count: 4 } }],
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

beforeEach(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useCoachingFeedback', () => {
  it('success: loading -> success with the coaching text and the voice callback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { coaching: 'Strong round!' }));
    vi.stubGlobal('fetch', fetchMock);
    const onFeedback = vi.fn();

    const { result } = renderHook(() => useCoachingFeedback({ onFeedback }));
    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.requestRoundFeedback(makeSummary(), 1);
    });
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.feedback).toBe('Strong round!');
    expect(onFeedback).toHaveBeenCalledWith('Strong round!');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/coach');
    const body = JSON.parse(init.body as string);
    expect(body.type).toBe('round');
    expect(body.roundNumber).toBe(1);
    // The active language travels in the body…
    expect(body.locale).toBe('en');
    // …and the engine's structured notes arrive already translated.
    expect(body.summary.corrections).toEqual([
      'Hands fell below the ideal height (4x)',
    ]);
  });

  it('the coaching follows the interface language (locale + translated notes)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { coaching: 'Bom round!' }));
    vi.stubGlobal('fetch', fetchMock);
    await i18n.changeLanguage('pt-BR');

    const { result } = renderHook(() => useCoachingFeedback());
    act(() => {
      result.current.requestSessionFeedback(makeSummary());
    });
    await waitFor(() => expect(result.current.status).toBe('success'));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.locale).toBe('pt-BR');
    expect(body.summary.corrections).toEqual(['Mãos caíram da altura ideal (4x)']);
  });

  it('503 (no API key) becomes "unavailable" without exposing a technical error', async () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(1); // a 503 gets no retry
  });

  it('a timeout becomes "unavailable" (with at most 1 retry)', async () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(2); // the attempt + 1 retry
  });

  it('a network error (local dev with no backend) degrades to "unavailable"', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCoachingFeedback());
    act(() => {
      result.current.requestSessionFeedback(makeSummary());
    });

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight request when the component unmounts', async () => {
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

  it('clear() aborts and goes back to "idle"', async () => {
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

    // the state stays idle (the aborted request's catch never leaks)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(result.current.status).toBe('idle');
  });
});
