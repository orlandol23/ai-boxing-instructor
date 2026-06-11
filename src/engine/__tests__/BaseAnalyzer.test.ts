import { describe, expect, it } from 'vitest';
import { analyzeBase } from '../BaseAnalyzer';
import { PoseLandmark } from '../types';
import { lm, makePose } from './fixtures';

const DEFAULT_SCORE = {
  overall: 50,
  footWidth: 50,
  kneeFlex: 50,
  weightDistribution: 50,
};

describe('analyzeBase', () => {
  it('scores an ideal base (shoulder-width feet, bent knees, centered hips) as 100', () => {
    const base = analyzeBase(makePose());
    expect(base.footWidth).toBe(100);
    expect(base.kneeFlex).toBe(100);
    expect(base.weightDistribution).toBe(100);
    expect(base.overall).toBe(100);
  });

  it('gives 0 foot width for feet close together', () => {
    // Spread 0.04 vs shoulder width 0.2 → ratio 0.2 < 0.3
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_ANKLE]: { x: 0.52 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0.48 },
      })
    );
    expect(base.footWidth).toBe(0);
  });

  it('gives 0 foot width for an overly wide stance', () => {
    // Spread 0.5 vs shoulder width 0.2 → ratio 2.5 > 2.0
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_ANKLE]: { x: 0.75 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0.25 },
      })
    );
    expect(base.footWidth).toBe(0);
  });

  it('accepts the foot width boundaries of the ideal range (0.8x and 1.3x)', () => {
    const narrowEdge = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_ANKLE]: { x: 0.58 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0.42 }, // spread 0.16 = 0.8 * 0.2
      })
    );
    const wideEdge = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_ANKLE]: { x: 0.63 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0.37 }, // spread 0.26 = 1.3 * 0.2
      })
    );
    expect(narrowEdge.footWidth).toBe(100);
    expect(wideEdge.footWidth).toBe(100);
  });

  it('penalizes locked knees (fully straight legs)', () => {
    // Hip, knee and ankle collinear → knee angle 180°
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_KNEE]: { x: 0.58, y: 0.8 },
        [PoseLandmark.LEFT_ANKLE]: { x: 0.6, y: 0.95 },
        [PoseLandmark.LEFT_HIP]: { x: 0.56, y: 0.65 },
        [PoseLandmark.RIGHT_KNEE]: { x: 0.42, y: 0.8 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0.4, y: 0.95 },
        [PoseLandmark.RIGHT_HIP]: { x: 0.44, y: 0.65 },
      })
    );
    expect(base.kneeFlex).toBe(0);
  });

  it('penalizes deeply bent knees (squatting)', () => {
    // Knee far forward of the hip-ankle line → angle well below 120°
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_KNEE]: { x: 0.8, y: 0.78 },
        [PoseLandmark.RIGHT_KNEE]: { x: 0.2, y: 0.78 },
      })
    );
    expect(base.kneeFlex).toBeLessThan(50);
  });

  it('gives 0 weight distribution when hips lean past half the foot spread', () => {
    // Foot center 0.5, spread 0.2 → hip offset 0.12 → ratio 0.6 >= 0.5
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_HIP]: { x: 0.68 },
        [PoseLandmark.RIGHT_HIP]: { x: 0.56 },
      })
    );
    expect(base.weightDistribution).toBe(0);
  });

  it('tolerates slight off-center weight (back-foot loading)', () => {
    // Offset 0.02 of spread 0.2 → ratio 0.1 <= 0.15 → still 100
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_HIP]: { x: 0.58 },
        [PoseLandmark.RIGHT_HIP]: { x: 0.46 },
      })
    );
    expect(base.weightDistribution).toBe(100);
  });

  it('returns the neutral default when the landmark array is incomplete', () => {
    expect(analyzeBase([])).toEqual(DEFAULT_SCORE);
    expect(analyzeBase([lm(0.5, 0.5)])).toEqual(DEFAULT_SCORE);
  });

  it('returns the neutral default when the lower body is not visible', () => {
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_ANKLE]: { visibility: 0.2 },
        [PoseLandmark.RIGHT_KNEE]: { visibility: 0.4 },
      })
    );
    expect(base).toEqual(DEFAULT_SCORE);
  });

  it('falls back to hip width as reference when shoulders are hidden', () => {
    // Hip width 0.12; spread 0.12 → ratio 1.0 → 100
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_SHOULDER]: { visibility: 0.1 },
        [PoseLandmark.RIGHT_SHOULDER]: { visibility: 0.1 },
        [PoseLandmark.LEFT_ANKLE]: { x: 0.56 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0.44 },
      })
    );
    expect(base.footWidth).toBe(100);
  });

  it('keeps every metric within the 0-100 range for extreme poses', () => {
    const base = analyzeBase(
      makePose({
        [PoseLandmark.LEFT_ANKLE]: { x: 1, y: 1 },
        [PoseLandmark.RIGHT_ANKLE]: { x: 0, y: 1 },
        [PoseLandmark.LEFT_HIP]: { x: 1 },
        [PoseLandmark.RIGHT_HIP]: { x: 0.9 },
      })
    );
    for (const value of Object.values(base)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
