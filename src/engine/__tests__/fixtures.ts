import { PoseLandmark } from '../types';
import type {
  AnalysisFrame,
  BaseScore,
  GuardScore,
  Landmark,
  PunchEvent,
} from '../types';

/** Creates a landmark with full visibility by default. */
export function lm(x: number, y: number, z = 0, visibility = 1): Landmark {
  return { x, y, z, visibility };
}

export type PoseOverrides = Partial<Record<number, Partial<Landmark>>>;

/**
 * Neutral guard-up boxer facing the camera (squared stance, z = 0).
 *
 * By construction:
 * - Guard: hands at chin height, elbows tucked (overall ~95)
 * - Base: feet at shoulder width, knees at ~158° (overall 100)
 */
export function makePose(overrides: PoseOverrides = {}): Landmark[] {
  const pose: Landmark[] = Array.from({ length: 33 }, () => lm(0.5, 0.25));

  pose[PoseLandmark.NOSE] = lm(0.5, 0.28);
  pose[PoseLandmark.LEFT_SHOULDER] = lm(0.6, 0.35);
  pose[PoseLandmark.RIGHT_SHOULDER] = lm(0.4, 0.35);
  pose[PoseLandmark.LEFT_ELBOW] = lm(0.58, 0.45);
  pose[PoseLandmark.RIGHT_ELBOW] = lm(0.42, 0.45);
  pose[PoseLandmark.LEFT_WRIST] = lm(0.55, 0.28);
  pose[PoseLandmark.RIGHT_WRIST] = lm(0.45, 0.28);
  pose[PoseLandmark.LEFT_HIP] = lm(0.56, 0.65);
  pose[PoseLandmark.RIGHT_HIP] = lm(0.44, 0.65);
  pose[PoseLandmark.LEFT_KNEE] = lm(0.61, 0.8);
  pose[PoseLandmark.RIGHT_KNEE] = lm(0.39, 0.8);
  pose[PoseLandmark.LEFT_ANKLE] = lm(0.6, 0.95);
  pose[PoseLandmark.RIGHT_ANKLE] = lm(0.4, 0.95);

  for (const [index, partial] of Object.entries(overrides)) {
    const i = Number(index);
    pose[i] = { ...pose[i], ...partial };
  }

  return pose;
}

export function makeGuard(overrides: Partial<GuardScore> = {}): GuardScore {
  return {
    overall: 80,
    leftHandHeight: 80,
    rightHandHeight: 80,
    elbowTuck: 80,
    chinTuck: 80,
    ...overrides,
  };
}

export function makeBase(overrides: Partial<BaseScore> = {}): BaseScore {
  return {
    overall: 80,
    footWidth: 80,
    kneeFlex: 80,
    weightDistribution: 80,
    ...overrides,
  };
}

export function makePunch(overrides: Partial<PunchEvent> = {}): PunchEvent {
  return {
    type: 'jab',
    timestamp: 1000,
    elbowExtension: 170,
    returnSpeed: 0,
    shoulderRotation: 10,
    quality: 'good',
    ...overrides,
  };
}

export function makeFrame(overrides: Partial<AnalysisFrame> = {}): AnalysisFrame {
  return {
    timestamp: 0,
    stance: 'orthodox',
    guard: makeGuard(),
    base: makeBase(),
    activePunch: null,
    landmarks: [],
    angles: {
      leftElbow: null,
      rightElbow: null,
      leftShoulder: null,
      rightShoulder: null,
      leftKnee: null,
      rightKnee: null,
    },
    ...overrides,
  };
}
