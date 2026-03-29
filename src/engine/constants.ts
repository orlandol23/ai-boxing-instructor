import { PoseLandmark } from './types';
import type { PoseLandmarkIndex } from './types';

export const VISIBILITY_THRESHOLD = 0.5;

// Stance detection thresholds
export const STANCE_MIN_X_SPREAD = 0.05;
export const STANCE_MIN_ANKLE_Z_DIFF = 0.02;
export const STANCE_MIN_SHOULDER_Z_DIFF = 0.01;

export const SKELETON_CONNECTIONS: [PoseLandmarkIndex, PoseLandmarkIndex][] = [
  // Face
  [PoseLandmark.LEFT_EAR, PoseLandmark.LEFT_EYE],
  [PoseLandmark.LEFT_EYE, PoseLandmark.NOSE],
  [PoseLandmark.NOSE, PoseLandmark.RIGHT_EYE],
  [PoseLandmark.RIGHT_EYE, PoseLandmark.RIGHT_EAR],
  // Torso
  [PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER],
  [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_HIP],
  [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_HIP],
  [PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP],
  // Left arm
  [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW],
  [PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST],
  // Right arm
  [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW],
  [PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST],
  // Left leg
  [PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE],
  [PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_ANKLE],
  [PoseLandmark.LEFT_ANKLE, PoseLandmark.LEFT_HEEL],
  [PoseLandmark.LEFT_ANKLE, PoseLandmark.LEFT_FOOT_INDEX],
  // Right leg
  [PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE],
  [PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_ANKLE],
  [PoseLandmark.RIGHT_ANKLE, PoseLandmark.RIGHT_HEEL],
  [PoseLandmark.RIGHT_ANKLE, PoseLandmark.RIGHT_FOOT_INDEX],
];

export const SCORE_COLORS = {
  excellent: '#22C55E', // green — 90-100
  attention: '#EAB308', // yellow — 70-89
  critical: '#EF4444', // red — < 70
} as const;

export function getScoreColor(score: number): string {
  if (score >= 90) return SCORE_COLORS.excellent;
  if (score >= 70) return SCORE_COLORS.attention;
  return SCORE_COLORS.critical;
}
