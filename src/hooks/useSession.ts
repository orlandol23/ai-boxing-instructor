import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisFrame, SessionSummary } from '../engine/types';
import { SessionTracker, type SessionPhase } from '../engine/SessionTracker';

interface UseSessionOptions {
  frame: AnalysisFrame | null;
}

interface UseSessionReturn {
  phase: SessionPhase;
  currentRound: number;
  roundElapsedMs: number;
  summary: SessionSummary;
  startSession: () => void;
  startRound: () => void;
  endRound: () => SessionSummary;
  endSession: () => SessionSummary;
  recordCorrection: (ruleKey: string) => void;
  reset: () => void;
}

const ROUND_TIMER_INTERVAL_MS = 250;

/**
 * Hook for managing a training session lifecycle (rounds + summary).
 *
 * Owns a SessionTracker instance and feeds it the analysis frames
 * produced upstream. The `summary` field is computed at render time
 * from the tracker, so it stays in sync without forcing setState
 * inside the frame-feeding effect (which would violate the
 * react-hooks/set-state-in-effect rule). The host component naturally
 * re-renders frequently enough (frame updates + round clock ticks)
 * for the summary to feel live.
 */
export function useSession({ frame }: UseSessionOptions): UseSessionReturn {
  const [tracker] = useState(() => new SessionTracker());
  const [phase, setPhase] = useState<SessionPhase>(tracker.getPhase());
  const [currentRound, setCurrentRound] = useState(tracker.getCurrentRoundNumber());
  const [roundElapsedMs, setRoundElapsedMs] = useState(0);
  const roundStartRef = useRef<number | null>(null);

  // Feed every new analysis frame into the tracker while in a round.
  // recordFrame is a no-op outside of in_round, so the phase guard
  // is just an early exit; semantics are correct either way.
  useEffect(() => {
    if (!frame || phase !== 'in_round') return;
    tracker.recordFrame(frame);
  }, [frame, phase, tracker]);

  // Tick the round clock while in a round. The interval's tick callback
  // is invoked asynchronously, so its setState calls don't run inside
  // the effect body itself.
  useEffect(() => {
    if (phase !== 'in_round' || roundStartRef.current === null) return;
    const start = roundStartRef.current;
    const id = window.setInterval(
      () => setRoundElapsedMs(performance.now() - start),
      ROUND_TIMER_INTERVAL_MS
    );
    return () => window.clearInterval(id);
  }, [phase]);

  const startSession = useCallback(() => {
    tracker.startSession();
    setPhase(tracker.getPhase());
    setCurrentRound(tracker.getCurrentRoundNumber());
    setRoundElapsedMs(0);
    roundStartRef.current = null;
  }, [tracker]);

  const startRound = useCallback(() => {
    tracker.startRound();
    roundStartRef.current = performance.now();
    setPhase(tracker.getPhase());
    setCurrentRound(tracker.getCurrentRoundNumber());
    setRoundElapsedMs(0);
  }, [tracker]);

  const endRound = useCallback((): SessionSummary => {
    tracker.endRound();
    roundStartRef.current = null;
    setPhase(tracker.getPhase());
    setRoundElapsedMs(0);
    // Post-round snapshot for consumers (e.g. the round's AI coach).
    return tracker.getSummary();
  }, [tracker]);

  const endSession = useCallback((): SessionSummary => {
    const finalSummary = tracker.endSession();
    roundStartRef.current = null;
    setPhase(tracker.getPhase());
    setRoundElapsedMs(0);
    return finalSummary;
  }, [tracker]);

  const recordCorrection = useCallback(
    (ruleKey: string) => tracker.recordCorrection(ruleKey),
    [tracker]
  );

  const reset = useCallback(() => {
    tracker.reset();
    roundStartRef.current = null;
    setPhase(tracker.getPhase());
    setCurrentRound(tracker.getCurrentRoundNumber());
    setRoundElapsedMs(0);
  }, [tracker]);

  const summary = tracker.getSummary();

  return {
    phase,
    currentRound,
    roundElapsedMs,
    summary,
    startSession,
    startRound,
    endRound,
    endSession,
    recordCorrection,
    reset,
  };
}
