import { useEffect, useMemo, useRef, useState } from 'react';
import type { Landmark, AnalysisFrame, PunchEvent } from '../engine/types';
import { BoxingEngine } from '../engine/BoxingEngine';

interface UseBoxingAnalysisOptions {
  landmarks: Landmark[] | null;
}

interface UseBoxingAnalysisReturn {
  frame: AnalysisFrame | null;
  recentPunches: PunchEvent[];
  punchCount: number;
}

const PUNCH_DISPLAY_DURATION = 2000;

/**
 * Hook that connects MediaPipe landmarks to the BoxingEngine.
 *
 * Uses useState for the engine instance (safe to read in useMemo).
 * BoxingEngine.analyze() is idempotent per landmarks reference,
 * making it safe under React Strict Mode double-invocation.
 */
export function useBoxingAnalysis({
  landmarks,
}: UseBoxingAnalysisOptions): UseBoxingAnalysisReturn {
  // Engine stored in state — stable instance, safe to read during render
  const [engine] = useState(() => new BoxingEngine());
  const [recentPunches, setRecentPunches] = useState<PunchEvent[]>([]);
  const punchCountRef = useRef(0);
  const [punchCount, setPunchCount] = useState(0);

  // Compute analysis frame synchronously during render.
  // analyze() is idempotent per landmarks reference (cached), so Strict Mode
  // double-renders won't cause duplicate punch detections.
  // onPoseLost() resets PunchClassifier when pose disappears, preventing
  // stale data from causing false detections when pose returns.
  const frame = useMemo<AnalysisFrame | null>(() => {
    if (!landmarks) {
      engine.onPoseLost();
      return null;
    }
    return engine.analyze(landmarks);
  }, [landmarks, engine]);

  // Track detected punches
  const activePunch = frame?.activePunch ?? null;

  useEffect(() => {
    if (!activePunch) return;

    punchCountRef.current++;
    setPunchCount(punchCountRef.current);
    setRecentPunches((prev) => [...prev, activePunch]);
  }, [activePunch]);

  // Clean up old punches based on oldest punch's expiry time
  useEffect(() => {
    if (recentPunches.length === 0) return;

    const now = performance.now();
    const oldestTimestamp = Math.min(...recentPunches.map((p) => p.timestamp));
    const delay = Math.max(0, PUNCH_DISPLAY_DURATION - (now - oldestTimestamp));

    const timer = setTimeout(() => {
      const cleanupNow = performance.now();
      setRecentPunches((prev) =>
        prev.filter((p) => cleanupNow - p.timestamp < PUNCH_DISPLAY_DURATION)
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [recentPunches]);

  return { frame, recentPunches, punchCount };
}
