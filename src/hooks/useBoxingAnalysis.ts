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
 * Uses useState for the engine instance (safe to read in useMemo)
 * and tracks punches via a separate effect.
 */
export function useBoxingAnalysis({
  landmarks,
}: UseBoxingAnalysisOptions): UseBoxingAnalysisReturn {
  // Engine stored in state — stable instance, safe to read during render
  const [engine] = useState(() => new BoxingEngine());
  const [recentPunches, setRecentPunches] = useState<PunchEvent[]>([]);
  const punchCountRef = useRef(0);
  const [punchCount, setPunchCount] = useState(0);

  // Compute analysis frame synchronously during render
  const frame = useMemo<AnalysisFrame | null>(() => {
    if (!landmarks) return null;
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

  // Clean up old punches from display
  useEffect(() => {
    if (recentPunches.length === 0) return;

    const timer = setTimeout(() => {
      const now = performance.now();
      setRecentPunches((prev) =>
        prev.filter((p) => now - p.timestamp < PUNCH_DISPLAY_DURATION)
      );
    }, PUNCH_DISPLAY_DURATION);

    return () => clearTimeout(timer);
  }, [recentPunches]);

  return { frame, recentPunches, punchCount };
}
