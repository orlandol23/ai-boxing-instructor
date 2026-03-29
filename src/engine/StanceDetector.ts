import type { Landmark, Stance } from './types';
import { PoseLandmark } from './types';
import {
  VISIBILITY_THRESHOLD,
  STANCE_MIN_X_SPREAD,
  STANCE_MIN_ANKLE_Z_DIFF,
  STANCE_MIN_SHOULDER_Z_DIFF,
} from './constants';

/**
 * Detects boxing stance (orthodox vs southpaw) based on foot positioning.
 *
 * Orthodox: left foot forward, right foot back
 * Southpaw: right foot forward, left foot back
 *
 * Uses the Z-axis (depth) when visibility is good, with shoulder
 * orientation as a secondary signal. Falls back to 'unknown' when
 * key landmarks are not visible.
 */
export function detectStance(landmarks: Landmark[]): Stance {
  if (landmarks.length < 33) return 'unknown';

  const leftAnkle = landmarks[PoseLandmark.LEFT_ANKLE];
  const rightAnkle = landmarks[PoseLandmark.RIGHT_ANKLE];
  const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
  const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];

  // Need both ankles or both shoulders visible to compare sides
  const anklesVisible =
    leftAnkle.visibility >= VISIBILITY_THRESHOLD &&
    rightAnkle.visibility >= VISIBILITY_THRESHOLD;
  const shouldersVisible =
    leftShoulder.visibility >= VISIBILITY_THRESHOLD &&
    rightShoulder.visibility >= VISIBILITY_THRESHOLD;

  if (!anklesVisible && !shouldersVisible) return 'unknown';

  // Primary: use ankle Z-axis (depth). In MediaPipe, smaller Z = closer to camera = forward.
  // We also check the X-axis spread to confirm the person is in a staggered stance.
  if (anklesVisible) {
    const zDiff = leftAnkle.z - rightAnkle.z;
    const xSpread = Math.abs(leftAnkle.x - rightAnkle.x);

    // Need minimum lateral spread and depth offset; otherwise fall through to shoulder check
    const hasMinSpread = xSpread >= STANCE_MIN_X_SPREAD;
    const hasMinDepthOffset = Math.abs(zDiff) >= STANCE_MIN_ANKLE_Z_DIFF;

    if (hasMinSpread && hasMinDepthOffset) {
      // Left foot has smaller Z (closer/forward) = orthodox
      return zDiff < 0 ? 'orthodox' : 'southpaw';
    }
    // Ankle signal not conclusive; fall through to shoulder check
  }

  // Secondary: shoulder orientation — the lead shoulder is slightly forward
  if (shouldersVisible) {
    const shoulderZDiff = leftShoulder.z - rightShoulder.z;

    if (Math.abs(shoulderZDiff) < STANCE_MIN_SHOULDER_Z_DIFF) return 'unknown';

    return shoulderZDiff < 0 ? 'orthodox' : 'southpaw';
  }

  return 'unknown';
}
