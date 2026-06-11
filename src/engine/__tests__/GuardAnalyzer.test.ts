import { describe, expect, it } from 'vitest';
import { analyzeGuard } from '../GuardAnalyzer';
import { PoseLandmark } from '../types';
import { lm, makePose } from './fixtures';

const DEFAULT_SCORE = {
  overall: 50,
  leftHandHeight: 50,
  rightHandHeight: 50,
  elbowTuck: 50,
  chinTuck: 50,
};

describe('analyzeGuard', () => {
  it('scores a tight guard (hands up, elbows tucked) highly', () => {
    const guard = analyzeGuard(makePose());
    expect(guard.leftHandHeight).toBe(100);
    expect(guard.rightHandHeight).toBe(100);
    expect(guard.elbowTuck).toBe(100);
    expect(guard.overall).toBeGreaterThanOrEqual(85);
  });

  it('gives 100 hand height when wrists are above the shoulders', () => {
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { y: 0.2 },
        [PoseLandmark.RIGHT_WRIST]: { y: 0.2 },
      })
    );
    expect(guard.leftHandHeight).toBe(100);
    expect(guard.rightHandHeight).toBe(100);
  });

  it('gives 0 hand height when hands drop to hip level', () => {
    // Hips at y=0.65, shoulders at y=0.35
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { y: 0.65 },
        [PoseLandmark.RIGHT_WRIST]: { y: 0.7 },
      })
    );
    expect(guard.leftHandHeight).toBe(0);
    expect(guard.rightHandHeight).toBe(0);
  });

  it('gives ~50 hand height when hands are halfway down the torso', () => {
    // Halfway between shoulder (0.35) and hip (0.65) = 0.5
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { y: 0.5 },
      })
    );
    expect(guard.leftHandHeight).toBe(50);
  });

  it('penalizes dropped hands in the overall score', () => {
    const tight = analyzeGuard(makePose());
    const dropped = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { y: 0.65 },
        [PoseLandmark.RIGHT_WRIST]: { y: 0.65 },
      })
    );
    expect(dropped.overall).toBeLessThan(tight.overall);
  });

  it('gives 0 elbow tuck for elbows flared far from the torso', () => {
    // Shoulder width 0.2, torso center 0.5 → drift >= 1.2 * 0.2 = 0.24
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_ELBOW]: { x: 0.75 },
        [PoseLandmark.RIGHT_ELBOW]: { x: 0.25 },
      })
    );
    expect(guard.elbowTuck).toBe(0);
  });

  it('falls back to 50 elbow tuck per elbow when an elbow is not visible', () => {
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_ELBOW]: { visibility: 0.1 },
        [PoseLandmark.RIGHT_ELBOW]: { visibility: 0.1 },
      })
    );
    expect(guard.elbowTuck).toBe(50);
  });

  it('returns the neutral default when the landmark array is incomplete', () => {
    expect(analyzeGuard([])).toEqual(DEFAULT_SCORE);
    expect(analyzeGuard([lm(0.5, 0.5)])).toEqual(DEFAULT_SCORE);
  });

  it('returns the neutral default when wrists are not visible', () => {
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { visibility: 0.1 },
      })
    );
    expect(guard).toEqual(DEFAULT_SCORE);
  });

  it('returns the neutral default when shoulders are not visible', () => {
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_SHOULDER]: { visibility: 0.3 },
        [PoseLandmark.RIGHT_SHOULDER]: { visibility: 0.3 },
      })
    );
    expect(guard).toEqual(DEFAULT_SCORE);
  });

  it('still scores hand height with hips hidden (chest-up framing)', () => {
    // Falls back to shoulder width (0.2) as torso height reference
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_HIP]: { visibility: 0.1 },
        [PoseLandmark.RIGHT_HIP]: { visibility: 0.1 },
        [PoseLandmark.LEFT_WRIST]: { y: 0.45 }, // 0.1 below shoulder = half of 0.2
      })
    );
    expect(guard.leftHandHeight).toBe(50);
    expect(guard.rightHandHeight).toBe(100);
  });

  it('falls back to 50 chin tuck when the nose is not visible', () => {
    const guard = analyzeGuard(
      makePose({
        [PoseLandmark.NOSE]: { visibility: 0.2 },
      })
    );
    expect(guard.chinTuck).toBe(50);
  });

  it('scores chin protection higher when hands are near the face', () => {
    const protectedChin = analyzeGuard(makePose()); // wrists at nose height
    const exposedChin = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { y: 0.5 },
        [PoseLandmark.RIGHT_WRIST]: { y: 0.5 },
      })
    );
    expect(protectedChin.chinTuck).toBeGreaterThan(exposedChin.chinTuck);
  });

  it('keeps every metric within the 0-100 range', () => {
    const extreme = analyzeGuard(
      makePose({
        [PoseLandmark.LEFT_WRIST]: { x: 0, y: 1 },
        [PoseLandmark.RIGHT_WRIST]: { x: 1, y: 1 },
        [PoseLandmark.LEFT_ELBOW]: { x: 0 },
        [PoseLandmark.RIGHT_ELBOW]: { x: 1 },
      })
    );
    for (const value of Object.values(extreme)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
