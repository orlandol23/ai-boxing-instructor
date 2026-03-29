import type { Landmark, GuardScore } from './types';
import { PoseLandmark } from './types';
import { VISIBILITY_THRESHOLD, CHIN_FACE_COVERAGE_DIST, CHIN_TUCK_VERTICAL_GAP } from './constants';

const DEFAULT_GUARD: GuardScore = {
  overall: 0,
  leftHandHeight: 0,
  rightHandHeight: 0,
  elbowTuck: 0,
  chinTuck: 0,
};

/**
 * Analyzes boxing guard quality based on hand positioning relative
 * to shoulders/chin, elbow tuck, and chin protection.
 *
 * Scoring (0-100 per metric):
 * - Hand height: how high the wrists are relative to shoulders (hands up = good)
 * - Elbow tuck: how close elbows are to the torso (tight = good)
 * - Chin tuck: how protected the chin is (chin down, hands near face = good)
 */
export function analyzeGuard(landmarks: Landmark[]): GuardScore {
  if (landmarks.length < 33) return { ...DEFAULT_GUARD };

  const lm = (i: number) => landmarks[i];

  const leftWrist = lm(PoseLandmark.LEFT_WRIST);
  const rightWrist = lm(PoseLandmark.RIGHT_WRIST);
  const leftElbow = lm(PoseLandmark.LEFT_ELBOW);
  const rightElbow = lm(PoseLandmark.RIGHT_ELBOW);
  const leftShoulder = lm(PoseLandmark.LEFT_SHOULDER);
  const rightShoulder = lm(PoseLandmark.RIGHT_SHOULDER);
  const nose = lm(PoseLandmark.NOSE);
  const leftHip = lm(PoseLandmark.LEFT_HIP);
  const rightHip = lm(PoseLandmark.RIGHT_HIP);

  const upperBodyVisible =
    leftWrist.visibility >= VISIBILITY_THRESHOLD &&
    rightWrist.visibility >= VISIBILITY_THRESHOLD &&
    leftShoulder.visibility >= VISIBILITY_THRESHOLD &&
    rightShoulder.visibility >= VISIBILITY_THRESHOLD &&
    leftHip.visibility >= VISIBILITY_THRESHOLD &&
    rightHip.visibility >= VISIBILITY_THRESHOLD;

  if (!upperBodyVisible) return { ...DEFAULT_GUARD };

  // -- Hand Height Score --
  // In normalized coords, Y increases downward. Hands should be at or above shoulder level.
  // Perfect: wrist.y <= shoulder.y (hands at or above shoulder height)
  // Score decreases as hands drop below shoulders
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const torsoHeight = hipY - shoulderY; // positive value

  const leftHandScore = scoreHandHeight(leftWrist.y, shoulderY, torsoHeight);
  const rightHandScore = scoreHandHeight(rightWrist.y, shoulderY, torsoHeight);

  // -- Elbow Tuck Score --
  // Elbows should be close to the ribs (small horizontal distance from torso center)
  const torsoCenter = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);

  const leftElbowTuck = scoreElbowTuck(leftElbow, torsoCenter, shoulderWidth);
  const rightElbowTuck = scoreElbowTuck(rightElbow, torsoCenter, shoulderWidth);
  const elbowTuckScore = (leftElbowTuck + rightElbowTuck) / 2;

  // -- Chin Tuck Score --
  // Chin is protected when hands are near face/chin level and nose is well tucked relative to the shoulder line
  const chinTuckScore = scoreChinTuck(nose, leftWrist, rightWrist, shoulderY);

  const overall = Math.round(
    leftHandScore * 0.25 +
    rightHandScore * 0.25 +
    elbowTuckScore * 0.25 +
    chinTuckScore * 0.25
  );

  return {
    overall,
    leftHandHeight: Math.round(leftHandScore),
    rightHandHeight: Math.round(rightHandScore),
    elbowTuck: Math.round(elbowTuckScore),
    chinTuck: Math.round(chinTuckScore),
  };
}

function scoreHandHeight(
  wristY: number,
  shoulderY: number,
  torsoHeight: number
): number {
  if (torsoHeight <= 0) return 50;

  // How far below shoulder the hand is, as fraction of torso height
  const dropFraction = (wristY - shoulderY) / torsoHeight;

  // Hands at or above shoulders = 100
  if (dropFraction <= 0) return 100;
  // Hands at hip level = 0
  if (dropFraction >= 1) return 0;

  // Linear falloff
  return 100 * (1 - dropFraction);
}

function scoreElbowTuck(
  elbow: Landmark,
  torsoCenter: number,
  shoulderWidth: number
): number {
  if (elbow.visibility < VISIBILITY_THRESHOLD || shoulderWidth <= 0) return 50;

  // How far from torso center, as fraction of shoulder width
  const drift = Math.abs(elbow.x - torsoCenter) / shoulderWidth;

  // Tight to body (drift <= 0.5 of shoulder width) = max score
  // Flared out (drift >= 1.2 of shoulder width) = 0 score
  if (drift <= 0.5) return 100;
  if (drift >= 1.2) return 0;

  return 100 * (1 - (drift - 0.5) / 0.7);
}

function scoreChinTuck(
  nose: Landmark,
  leftWrist: Landmark,
  rightWrist: Landmark,
  shoulderY: number
): number {
  if (nose.visibility < VISIBILITY_THRESHOLD) return 50;

  // Average wrist height relative to nose — hands near face = protected chin
  const avgWristY = (leftWrist.y + rightWrist.y) / 2;
  const noseToWristDist = Math.abs(nose.y - avgWristY);

  // Small distance (hands near face) = good
  // Score based on how close wrists are to nose level
  const faceCoverage = Math.max(0, 1 - noseToWristDist / CHIN_FACE_COVERAGE_DIST);

  // Nose should be closer to the shoulder line (chin tucked, not head up).
  // In MediaPipe, y increases downward, and in normal posture nose.y < shoulderY.
  // As the head lowers (chin tuck), nose.y moves down toward shoulderY, reducing
  // the vertical gap. We map a smaller gap to a higher chin-tuck score.
  const verticalGap = shoulderY - nose.y; // positive when nose is above shoulders
  const chinTuck = 1 - Math.max(0, Math.min(1, verticalGap / CHIN_TUCK_VERTICAL_GAP));

  return faceCoverage * 70 + chinTuck * 30;
}
