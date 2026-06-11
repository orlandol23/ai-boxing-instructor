import { beforeEach, describe, expect, it } from 'vitest';
import { PunchClassifier } from '../PunchClassifier';
import { PoseLandmark } from '../types';
import type { Landmark, PunchEvent, Stance } from '../types';
import { makePose, type PoseOverrides } from './fixtures';

/**
 * Poses for the LEFT arm (shoulder fixed at 0.6, 0.35).
 * Elbow angles verified geometrically against calculateAngle.
 */
const LEFT_BENT: PoseOverrides = {
  // Elbow angle ~128° (below the 140° extension threshold)
  [PoseLandmark.LEFT_ELBOW]: { x: 0.62, y: 0.45 },
  [PoseLandmark.LEFT_WRIST]: { x: 0.66, y: 0.47 },
};

const LEFT_STRAIGHT: PoseOverrides = {
  // Collinear shoulder-elbow-wrist (~180°), wrist near body center → straight punch
  [PoseLandmark.LEFT_ELBOW]: { x: 0.55, y: 0.43 },
  [PoseLandmark.LEFT_WRIST]: { x: 0.5, y: 0.51 },
};

const LEFT_UPPERCUT: PoseOverrides = {
  // Arm extended with wrist moving up (dy = -0.12)
  [PoseLandmark.LEFT_ELBOW]: { x: 0.62, y: 0.35 },
  [PoseLandmark.LEFT_WRIST]: { x: 0.64, y: 0.35 },
};

const LEFT_HOOK: PoseOverrides = {
  // Arm extended laterally, wrist far from body center, dx >> dy
  [PoseLandmark.LEFT_ELBOW]: { x: 0.75, y: 0.41 },
  [PoseLandmark.LEFT_WRIST]: { x: 0.9, y: 0.47 },
};

const RIGHT_BENT: PoseOverrides = {
  [PoseLandmark.RIGHT_ELBOW]: { x: 0.38, y: 0.45 },
  [PoseLandmark.RIGHT_WRIST]: { x: 0.34, y: 0.47 },
};

const RIGHT_STRAIGHT: PoseOverrides = {
  [PoseLandmark.RIGHT_ELBOW]: { x: 0.45, y: 0.43 },
  [PoseLandmark.RIGHT_WRIST]: { x: 0.5, y: 0.51 },
};

function feed(
  classifier: PunchClassifier,
  poses: PoseOverrides[],
  stance: Stance = 'orthodox'
) {
  let last: PunchEvent | null = null;
  for (const overrides of poses) {
    last = classifier.classify(makePose(overrides), stance);
  }
  return last;
}

describe('PunchClassifier', () => {
  let classifier: PunchClassifier;

  beforeEach(() => {
    classifier = new PunchClassifier();
  });

  it('returns null when the landmark array is incomplete', () => {
    expect(classifier.classify([], 'orthodox')).toBeNull();
  });

  it('returns null on the first frame (no previous wrist data)', () => {
    expect(classifier.classify(makePose(LEFT_STRAIGHT), 'orthodox')).toBeNull();
  });

  it('returns null while the arm stays bent', () => {
    expect(feed(classifier, [LEFT_BENT, LEFT_BENT, LEFT_BENT])).toBeNull();
  });

  it('returns null when the arm is already extended (no bent-to-extended crossing)', () => {
    expect(feed(classifier, [LEFT_STRAIGHT, LEFT_STRAIGHT])).toBeNull();
  });

  it('detects a fast lead-hand extension as a jab in orthodox stance', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_STRAIGHT], 'orthodox');
    expect(punch).not.toBeNull();
    expect(punch!.type).toBe('jab');
    expect(punch!.elbowExtension).toBeGreaterThanOrEqual(160);
    expect(punch!.quality).toBe('good');
  });

  it('classifies the same left-hand punch as a cross in southpaw stance', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_STRAIGHT], 'southpaw');
    expect(punch!.type).toBe('cross');
  });

  it('assumes the left hand is the lead when the stance is unknown', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_STRAIGHT], 'unknown');
    expect(punch!.type).toBe('jab');
  });

  it('detects a rear-hand straight punch as a cross in orthodox stance', () => {
    const punch = feed(classifier, [RIGHT_BENT, RIGHT_STRAIGHT], 'orthodox');
    expect(punch).not.toBeNull();
    expect(punch!.type).toBe('cross');
  });

  it('classifies the right hand as the lead (jab) in southpaw stance', () => {
    const punch = feed(classifier, [RIGHT_BENT, RIGHT_STRAIGHT], 'southpaw');
    expect(punch!.type).toBe('jab');
  });

  it('classifies a strong upward extension as a lead uppercut', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_UPPERCUT], 'orthodox');
    expect(punch).not.toBeNull();
    expect(punch!.type).toBe('lead_uppercut');
  });

  it('classifies the upward extension as a rear uppercut in southpaw stance', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_UPPERCUT], 'southpaw');
    expect(punch!.type).toBe('rear_uppercut');
  });

  it('classifies a wide lateral extension as a lead hook', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_HOOK], 'orthodox');
    expect(punch).not.toBeNull();
    expect(punch!.type).toBe('lead_hook');
  });

  it('ignores slow extensions below the velocity threshold', () => {
    // Wrist barely moves (~0.022/frame < 0.04) while the elbow angle crosses 140°
    const slowExtend: PoseOverrides = {
      [PoseLandmark.LEFT_ELBOW]: { x: 0.64, y: 0.405 },
      [PoseLandmark.LEFT_WRIST]: { x: 0.68, y: 0.46 },
    };
    expect(feed(classifier, [LEFT_BENT, slowExtend])).toBeNull();
  });

  it('rates a punch with velocity just above the minimum as poor', () => {
    // Velocity 0.045 (>= 0.04 detection, < 0.05 quality cutoff)
    const sluggish: PoseOverrides = {
      [PoseLandmark.LEFT_ELBOW]: { x: 0.6525, y: 0.41 },
      [PoseLandmark.LEFT_WRIST]: { x: 0.705, y: 0.47 },
    };
    const punch = feed(classifier, [LEFT_BENT, sluggish]);
    expect(punch).not.toBeNull();
    expect(punch!.quality).toBe('poor');
  });

  it('rates a medium-velocity punch as fair', () => {
    // Velocity 0.06 (>= 0.05 but < 0.07 needed for "good")
    const medium: PoseOverrides = {
      [PoseLandmark.LEFT_ELBOW]: { x: 0.66, y: 0.41 },
      [PoseLandmark.LEFT_WRIST]: { x: 0.72, y: 0.47 },
    };
    const punch = feed(classifier, [LEFT_BENT, medium]);
    expect(punch).not.toBeNull();
    expect(punch!.quality).toBe('fair');
  });

  it('enforces a cooldown between punches on the same arm', () => {
    expect(feed(classifier, [LEFT_BENT, LEFT_STRAIGHT])).not.toBeNull();
    // Immediately bend and extend again — still within cooldown
    expect(feed(classifier, [LEFT_BENT, LEFT_STRAIGHT])).toBeNull();
  });

  it('detects a new punch after the cooldown expires', () => {
    expect(feed(classifier, [LEFT_BENT, LEFT_STRAIGHT])).not.toBeNull();
    // 8 bent frames let the cooldown tick down to zero
    const cooldownFrames = Array.from({ length: 8 }, () => LEFT_BENT);
    expect(feed(classifier, cooldownFrames)).toBeNull();
    expect(feed(classifier, [LEFT_STRAIGHT])).not.toBeNull();
  });

  it('returns null and clears state when wrist visibility drops', () => {
    const hiddenWrist: PoseOverrides = {
      ...LEFT_STRAIGHT,
      [PoseLandmark.LEFT_WRIST]: {
        ...(LEFT_STRAIGHT[PoseLandmark.LEFT_WRIST] as Partial<Landmark>),
        visibility: 0.2,
      },
    };
    expect(feed(classifier, [LEFT_BENT, hiddenWrist])).toBeNull();
    // Previous state was cleared, so a visible extended frame alone is not a punch
    expect(feed(classifier, [LEFT_STRAIGHT])).toBeNull();
  });

  it('reports a single punch when both arms extend simultaneously', () => {
    const bothBent = { ...LEFT_BENT, ...RIGHT_BENT };
    const bothStraight = { ...LEFT_STRAIGHT, ...RIGHT_STRAIGHT };
    const punch = feed(classifier, [bothBent, bothStraight], 'orthodox');
    expect(punch).not.toBeNull();
    expect(['jab', 'cross']).toContain(punch!.type);
  });

  it('reset() clears tracked state', () => {
    classifier.classify(makePose(LEFT_BENT), 'orthodox');
    classifier.reset();
    expect(classifier.classify(makePose(LEFT_STRAIGHT), 'orthodox')).toBeNull();
  });

  it('produces punch events with timestamp and rounded metrics', () => {
    const punch = feed(classifier, [LEFT_BENT, LEFT_STRAIGHT]);
    expect(punch!.timestamp).toBeGreaterThan(0);
    expect(Number.isInteger(punch!.elbowExtension)).toBe(true);
    expect(Number.isInteger(punch!.shoulderRotation)).toBe(true);
    expect(punch!.returnSpeed).toBe(0);
  });
});
