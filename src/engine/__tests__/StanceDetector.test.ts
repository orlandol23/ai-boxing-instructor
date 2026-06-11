import { describe, expect, it } from 'vitest';
import { detectStance } from '../StanceDetector';
import { PoseLandmark } from '../types';
import { makePose } from './fixtures';

describe('detectStance', () => {
  it('returns unknown when the landmark array is incomplete', () => {
    expect(detectStance([])).toBe('unknown');
  });

  it('returns unknown for a squared stance (no depth offset)', () => {
    // Neutral pose: ankles and shoulders all at z = 0
    expect(detectStance(makePose())).toBe('unknown');
  });

  it('detects orthodox when the left foot is forward (smaller z)', () => {
    const pose = makePose({
      [PoseLandmark.LEFT_ANKLE]: { z: -0.05 },
      [PoseLandmark.RIGHT_ANKLE]: { z: 0.05 },
    });
    expect(detectStance(pose)).toBe('orthodox');
  });

  it('detects southpaw when the right foot is forward', () => {
    const pose = makePose({
      [PoseLandmark.LEFT_ANKLE]: { z: 0.05 },
      [PoseLandmark.RIGHT_ANKLE]: { z: -0.05 },
    });
    expect(detectStance(pose)).toBe('southpaw');
  });

  it('falls back to shoulder depth when the ankle signal is inconclusive', () => {
    const pose = makePose({
      // Feet too close laterally for the ankle heuristic
      [PoseLandmark.LEFT_ANKLE]: { x: 0.51, z: -0.05 },
      [PoseLandmark.RIGHT_ANKLE]: { x: 0.49, z: 0.05 },
      [PoseLandmark.LEFT_SHOULDER]: { z: 0.03 },
      [PoseLandmark.RIGHT_SHOULDER]: { z: -0.03 },
    });
    expect(detectStance(pose)).toBe('southpaw');
  });

  it('uses shoulders when ankles are not visible', () => {
    const pose = makePose({
      [PoseLandmark.LEFT_ANKLE]: { visibility: 0.1 },
      [PoseLandmark.RIGHT_ANKLE]: { visibility: 0.1 },
      [PoseLandmark.LEFT_SHOULDER]: { z: -0.03 },
      [PoseLandmark.RIGHT_SHOULDER]: { z: 0.03 },
    });
    expect(detectStance(pose)).toBe('orthodox');
  });

  it('returns unknown when neither ankles nor shoulders are visible', () => {
    const pose = makePose({
      [PoseLandmark.LEFT_ANKLE]: { visibility: 0.1 },
      [PoseLandmark.RIGHT_ANKLE]: { visibility: 0.1 },
      [PoseLandmark.LEFT_SHOULDER]: { visibility: 0.1 },
      [PoseLandmark.RIGHT_SHOULDER]: { visibility: 0.1 },
    });
    expect(detectStance(pose)).toBe('unknown');
  });
});
