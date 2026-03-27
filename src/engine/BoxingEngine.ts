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
 */
export class BoxingEngine {
  private punchClassifier = new PunchClassifier();

  reset(): void {
    this.punchClassifier.reset();
  }

  analyze(landmarks: Landmark[]): AnalysisFrame {
    const stance = detectStance(landmarks);
    const guard = analyzeGuard(landmarks);
    const base = analyzeBase(landmarks);
    const activePunch = this.punchClassifier.classify(landmarks, stance);
    const frameAngles = calculateFrameAngles(landmarks);

    return {
      timestamp: performance.now(),
      stance,
      guard,
      base,
      activePunch,
      landmarks,
      angles: { ...frameAngles },
    };
  }
}
