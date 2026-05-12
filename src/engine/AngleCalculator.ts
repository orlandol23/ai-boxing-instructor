import type { Landmark, FrameAngles } from './types';
import type { PoseLandmarkIndex } from './types';
import { PoseLandmark } from './types';
import { VISIBILITY_THRESHOLD } from './constants';

/**
 * Calculates the angle at vertex B formed by points A-B-C in degrees.
 * Returns a value between 0° and 180°.
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function isVisible(...landmarks: Landmark[]): boolean {
  return landmarks.every((l) => l.visibility >= VISIBILITY_THRESHOLD);
}

const NULL_ANGLES: FrameAngles = {
  leftElbow: null,
  rightElbow: null,
  leftShoulder: null,
  rightShoulder: null,
  leftKnee: null,
  rightKnee: null,
};

export function calculateFrameAngles(landmarks: Landmark[]): FrameAngles {
  if (landmarks.length < 33) return { ...NULL_ANGLES };

  const lm = (i: PoseLandmarkIndex) => landmarks[i];

  const leftElbow =
    isVisible(lm(PoseLandmark.LEFT_SHOULDER), lm(PoseLandmark.LEFT_ELBOW), lm(PoseLandmark.LEFT_WRIST))
      ? calculateAngle(lm(PoseLandmark.LEFT_SHOULDER), lm(PoseLandmark.LEFT_ELBOW), lm(PoseLandmark.LEFT_WRIST))
      : null;

  const rightElbow =
    isVisible(lm(PoseLandmark.RIGHT_SHOULDER), lm(PoseLandmark.RIGHT_ELBOW), lm(PoseLandmark.RIGHT_WRIST))
      ? calculateAngle(lm(PoseLandmark.RIGHT_SHOULDER), lm(PoseLandmark.RIGHT_ELBOW), lm(PoseLandmark.RIGHT_WRIST))
      : null;

  const leftShoulder =
    isVisible(lm(PoseLandmark.LEFT_ELBOW), lm(PoseLandmark.LEFT_SHOULDER), lm(PoseLandmark.LEFT_HIP))
      ? calculateAngle(lm(PoseLandmark.LEFT_ELBOW), lm(PoseLandmark.LEFT_SHOULDER), lm(PoseLandmark.LEFT_HIP))
      : null;

  const rightShoulder =
    isVisible(lm(PoseLandmark.RIGHT_ELBOW), lm(PoseLandmark.RIGHT_SHOULDER), lm(PoseLandmark.RIGHT_HIP))
      ? calculateAngle(lm(PoseLandmark.RIGHT_ELBOW), lm(PoseLandmark.RIGHT_SHOULDER), lm(PoseLandmark.RIGHT_HIP))
      : null;

  const leftKnee =
    isVisible(lm(PoseLandmark.LEFT_HIP), lm(PoseLandmark.LEFT_KNEE), lm(PoseLandmark.LEFT_ANKLE))
      ? calculateAngle(lm(PoseLandmark.LEFT_HIP), lm(PoseLandmark.LEFT_KNEE), lm(PoseLandmark.LEFT_ANKLE))
      : null;

  const rightKnee =
    isVisible(lm(PoseLandmark.RIGHT_HIP), lm(PoseLandmark.RIGHT_KNEE), lm(PoseLandmark.RIGHT_ANKLE))
      ? calculateAngle(lm(PoseLandmark.RIGHT_HIP), lm(PoseLandmark.RIGHT_KNEE), lm(PoseLandmark.RIGHT_ANKLE))
      : null;

  return { leftElbow, rightElbow, leftShoulder, rightShoulder, leftKnee, rightKnee };
}
