import type { Landmark, BaseScore } from './types';
import { PoseLandmark } from './types';
import { VISIBILITY_THRESHOLD } from './constants';

const DEFAULT_BASE: BaseScore = {
  overall: 0,
  footWidth: 0,
  kneeFlex: 0,
  weightDistribution: 0,
};

/**
 * Analyzes boxing base/stance quality based on foot width, knee flex,
 * and weight distribution.
 *
 * Scoring (0-100 per metric):
 * - Foot width: lateral spread should be ~shoulder width (too narrow or too wide = bad)
 * - Knee flex: knees should be slightly bent, not locked or over-bent
 * - Weight distribution: hips should be roughly centered between feet
 */
export function analyzeBase(landmarks: Landmark[]): BaseScore {
  if (landmarks.length < 33) return { ...DEFAULT_BASE };

  const lm = (i: number) => landmarks[i];

  const leftAnkle = lm(PoseLandmark.LEFT_ANKLE);
  const rightAnkle = lm(PoseLandmark.RIGHT_ANKLE);
  const leftKnee = lm(PoseLandmark.LEFT_KNEE);
  const rightKnee = lm(PoseLandmark.RIGHT_KNEE);
  const leftHip = lm(PoseLandmark.LEFT_HIP);
  const rightHip = lm(PoseLandmark.RIGHT_HIP);
  const leftShoulder = lm(PoseLandmark.LEFT_SHOULDER);
  const rightShoulder = lm(PoseLandmark.RIGHT_SHOULDER);

  const lowerBodyVisible =
    leftAnkle.visibility >= VISIBILITY_THRESHOLD &&
    rightAnkle.visibility >= VISIBILITY_THRESHOLD &&
    leftKnee.visibility >= VISIBILITY_THRESHOLD &&
    rightKnee.visibility >= VISIBILITY_THRESHOLD &&
    leftHip.visibility >= VISIBILITY_THRESHOLD &&
    rightHip.visibility >= VISIBILITY_THRESHOLD;

  if (!lowerBodyVisible) return { ...DEFAULT_BASE };

  // -- Foot Width Score --
  // Ideal foot spread is approximately shoulder width. Fall back to hip width
  // when shoulders are not sufficiently visible.
  const shouldersVisible =
    leftShoulder.visibility >= VISIBILITY_THRESHOLD &&
    rightShoulder.visibility >= VISIBILITY_THRESHOLD;
  const referenceWidth = shouldersVisible
    ? Math.abs(rightShoulder.x - leftShoulder.x)
    : Math.abs(rightHip.x - leftHip.x);
  const footSpread = Math.abs(rightAnkle.x - leftAnkle.x);
  const footWidthScore = scoreFootWidth(footSpread, referenceWidth);

  // -- Knee Flex Score --
  // Knees should be slightly bent. We check by comparing knee Y to a line
  // between hip and ankle — a bent knee will be slightly forward of straight.
  const leftKneeFlex = scoreKneeFlex(leftHip, leftKnee, leftAnkle);
  const rightKneeFlex = scoreKneeFlex(rightHip, rightKnee, rightAnkle);
  const kneeFlexScore = (leftKneeFlex + rightKneeFlex) / 2;

  // -- Weight Distribution Score --
  // Hip center should be roughly between the feet (not leaning too far)
  const hipCenter = (leftHip.x + rightHip.x) / 2;
  const footCenter = (leftAnkle.x + rightAnkle.x) / 2;
  const weightScore = scoreWeightDistribution(hipCenter, footCenter, footSpread);

  const overall = Math.round(
    footWidthScore * 0.35 +
    kneeFlexScore * 0.35 +
    weightScore * 0.30
  );

  return {
    overall,
    footWidth: Math.round(footWidthScore),
    kneeFlex: Math.round(kneeFlexScore),
    weightDistribution: Math.round(weightScore),
  };
}

function scoreFootWidth(footSpread: number, shoulderWidth: number): number {
  if (shoulderWidth <= 0) return 50;

  // Ratio of foot spread to shoulder width
  const ratio = footSpread / shoulderWidth;

  // Ideal: 0.8 to 1.3 of shoulder width
  if (ratio >= 0.8 && ratio <= 1.3) return 100;

  // Too narrow
  if (ratio < 0.8) {
    if (ratio < 0.3) return 0;
    return Math.round(100 * ((ratio - 0.3) / 0.5));
  }

  // Too wide
  if (ratio > 2.0) return 0;
  return Math.round(100 * (1 - (ratio - 1.3) / 0.7));
}

function scoreKneeFlex(hip: Landmark, knee: Landmark, ankle: Landmark): number {
  // Calculate the angle at the knee joint
  // Straight leg = ~180°, good bend = 150-170°, too bent = <140°
  const dx1 = hip.x - knee.x;
  const dy1 = hip.y - knee.y;
  const dx2 = ankle.x - knee.x;
  const dy2 = ankle.y - knee.y;

  const radians = Math.atan2(dy2, dx2) - Math.atan2(dy1, dx1);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;

  // 155-170° is ideal (slight bend)
  if (angle >= 155 && angle <= 170) return 100;

  // Locked knee (>175°)
  if (angle > 175) return Math.round(100 * (1 - (angle - 175) / 5));

  // Good range (145-155°)
  if (angle >= 145) return 85;

  // Too bent (<145°)
  if (angle >= 120) return Math.round(100 * ((angle - 120) / 35));

  return 0;
}

function scoreWeightDistribution(
  hipCenter: number,
  footCenter: number,
  footSpread: number
): number {
  if (footSpread <= 0) return 50;

  // How far hip center is from foot center, as fraction of foot spread
  const offset = Math.abs(hipCenter - footCenter) / footSpread;

  // Slightly off-center is fine in boxing (weight on back foot)
  if (offset <= 0.15) return 100;
  if (offset >= 0.5) return 0;

  return Math.round(100 * (1 - (offset - 0.15) / 0.35));
}
