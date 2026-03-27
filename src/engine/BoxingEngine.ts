import type { Landmark, AnalysisFrame } from './types';
import { detectStance } from './StanceDetector';
import { analyzeGuard } from './GuardAnalyzer';
import { analyzeBase } from './BaseAnalyzer';
import { PunchClassifier } from './PunchClassifier';
import { calculateFrameAngles } from './AngleCalculator';

/**
 * Orchestrates all boxing analysis modules into a single AnalysisFrame.
 *
 * Maintains state across frames for the PunchClassifier (which needs
 * frame-to-frame velocity tracking).
 *
 * analyze() is idempotent for the same landmarks reference — safe to call
 * from React render (useMemo) even under Strict Mode double-invocation.
 */
export class BoxingEngine {
  private punchClassifier = new PunchClassifier();
  private lastLandmarks: Landmark[] | null = null;
  private lastFrame: AnalysisFrame | null = null;

  reset(): void {
    this.punchClassifier.reset();
    this.lastLandmarks = null;
    this.lastFrame = null;
  }

  /**
   * Call when landmarks become null (pose lost) to reset stateful
   * components and prevent stale data from causing false detections.
   */
  onPoseLost(): void {
    if (this.lastLandmarks !== null) {
      this.punchClassifier.reset();
      this.lastLandmarks = null;
      this.lastFrame = null;
    }
  }

  analyze(landmarks: Landmark[]): AnalysisFrame {
    // Deduplicate: if called with the same landmarks reference (Strict Mode
    // double-render), return cached result without re-running PunchClassifier.
    if (landmarks === this.lastLandmarks && this.lastFrame) {
      return this.lastFrame;
    }

    const stance = detectStance(landmarks);
    const guard = analyzeGuard(landmarks);
    const base = analyzeBase(landmarks);
    const activePunch = this.punchClassifier.classify(landmarks, stance);
    const frameAngles = calculateFrameAngles(landmarks);

    const frame: AnalysisFrame = {
      timestamp: performance.now(),
      stance,
      guard,
      base,
      activePunch,
      landmarks,
      angles: { ...frameAngles },
    };

    this.lastLandmarks = landmarks;
    this.lastFrame = frame;

    return frame;
  }
}
