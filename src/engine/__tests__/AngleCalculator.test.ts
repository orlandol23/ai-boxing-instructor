import { describe, expect, it } from 'vitest';
import { calculateAngle, calculateFrameAngles } from '../AngleCalculator';
import { PoseLandmark } from '../types';
import { lm, makePose } from './fixtures';

describe('calculateAngle', () => {
  it('returns 90° for a right angle', () => {
    expect(calculateAngle(lm(1, 0), lm(0, 0), lm(0, 1))).toBeCloseTo(90, 5);
  });

  it('returns 180° for collinear points (straight arm)', () => {
    expect(calculateAngle(lm(-1, 0), lm(0, 0), lm(1, 0))).toBeCloseTo(180, 5);
  });

  it('returns 0° when both segments overlap', () => {
    expect(calculateAngle(lm(1, 0), lm(0, 0), lm(1, 0))).toBeCloseTo(0, 5);
  });

  it('returns 45° for a 45° bend', () => {
    expect(calculateAngle(lm(1, 0), lm(0, 0), lm(1, 1))).toBeCloseTo(45, 5);
  });

  it('normalizes reflex angles to the 0-180 range', () => {
    // Vectors at 135° and -135° from the vertex: raw atan2 diff is 270°
    const a = lm(-0.707, 0.707);
    const c = lm(-0.707, -0.707);
    expect(calculateAngle(a, lm(0, 0), c)).toBeCloseTo(90, 3);
  });

  it('is symmetric when swapping the outer points', () => {
    const a = lm(0.2, 0.9);
    const b = lm(0.5, 0.5);
    const c = lm(0.8, 0.7);
    expect(calculateAngle(a, b, c)).toBeCloseTo(calculateAngle(c, b, a), 5);
  });
});

describe('calculateFrameAngles', () => {
  it('computes all six joint angles for a fully visible pose', () => {
    const angles = calculateFrameAngles(makePose());
    expect(angles.leftElbow).not.toBeNull();
    expect(angles.rightElbow).not.toBeNull();
    expect(angles.leftShoulder).not.toBeNull();
    expect(angles.rightShoulder).not.toBeNull();
    expect(angles.leftKnee).not.toBeNull();
    expect(angles.rightKnee).not.toBeNull();
    for (const value of Object.values(angles)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(180);
    }
  });

  it('computes the knee angle of the neutral pose (~158°, slight bend)', () => {
    const angles = calculateFrameAngles(makePose());
    expect(angles.leftKnee).toBeGreaterThan(150);
    expect(angles.leftKnee).toBeLessThan(165);
  });

  it('returns all nulls when the landmark array is incomplete', () => {
    const angles = calculateFrameAngles([lm(0.5, 0.5)]);
    expect(angles).toEqual({
      leftElbow: null,
      rightElbow: null,
      leftShoulder: null,
      rightShoulder: null,
      leftKnee: null,
      rightKnee: null,
    });
  });

  it('returns all nulls for an empty landmark array', () => {
    const angles = calculateFrameAngles([]);
    expect(angles.leftElbow).toBeNull();
    expect(angles.rightKnee).toBeNull();
  });

  it('nulls only the joints whose landmarks have low visibility', () => {
    const pose = makePose({
      [PoseLandmark.LEFT_WRIST]: { visibility: 0.2 },
    });
    const angles = calculateFrameAngles(pose);
    expect(angles.leftElbow).toBeNull(); // depends on left wrist
    expect(angles.rightElbow).not.toBeNull();
    expect(angles.leftKnee).not.toBeNull();
  });

  it('treats visibility exactly at the 0.5 threshold as visible', () => {
    const pose = makePose({
      [PoseLandmark.LEFT_WRIST]: { visibility: 0.5 },
    });
    expect(calculateFrameAngles(pose).leftElbow).not.toBeNull();
  });
});
