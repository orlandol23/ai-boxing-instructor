import type { Landmark, Stance, PunchType, PunchEvent } from './types';
import { PoseLandmark } from './types';
import { VISIBILITY_THRESHOLD } from './constants';
import { calculateAngle } from './AngleCalculator';

/**
 * Minimum elbow extension angle to register a punch (degrees).
 * Below this, the arm is too bent to be punching.
 */
const PUNCH_EXTENSION_THRESHOLD = 140;

/**
 * Minimum wrist velocity (normalized units per frame) to detect a punch.
 * Prevents slow arm movements from being classified as punches.
 */
const PUNCH_VELOCITY_THRESHOLD = 0.04;

/**
 * Minimum frames between detected punches (debounce).
 */
const PUNCH_COOLDOWN_FRAMES = 8;

/**
 * Classifies punches based on arm extension, wrist velocity,
 * and position relative to the body.
 *
 * Detection approach:
 * 1. Track wrist positions across frames to compute velocity
 * 2. Detect extension events (arm extends past threshold)
 * 3. Classify punch type based on which arm, shoulder rotation, and trajectory
 */
export class PunchClassifier {
  private prevLeftWrist: Landmark | null = null;
  private prevRightWrist: Landmark | null = null;
  private cooldownLeft = 0;
  private cooldownRight = 0;
  private prevLeftElbowAngle = 0;
  private prevRightElbowAngle = 0;

  reset(): void {
    this.prevLeftWrist = null;
    this.prevRightWrist = null;
    this.cooldownLeft = 0;
    this.cooldownRight = 0;
    this.prevLeftElbowAngle = 0;
    this.prevRightElbowAngle = 0;
  }

  classify(landmarks: Landmark[], stance: Stance): PunchEvent | null {
    if (landmarks.length < 33) return null;

    const lm = (i: number) => landmarks[i];

    const leftWrist = lm(PoseLandmark.LEFT_WRIST);
    const rightWrist = lm(PoseLandmark.RIGHT_WRIST);
    const leftElbow = lm(PoseLandmark.LEFT_ELBOW);
    const rightElbow = lm(PoseLandmark.RIGHT_ELBOW);
    const leftShoulder = lm(PoseLandmark.LEFT_SHOULDER);
    const rightShoulder = lm(PoseLandmark.RIGHT_SHOULDER);

    // Decrement cooldowns
    if (this.cooldownLeft > 0) this.cooldownLeft--;
    if (this.cooldownRight > 0) this.cooldownRight--;

    // Calculate current elbow angles
    const leftElbowAngle = allVisible(leftShoulder, leftElbow, leftWrist)
      ? calculateAngle(leftShoulder, leftElbow, leftWrist)
      : 0;
    const rightElbowAngle = allVisible(rightShoulder, rightElbow, rightWrist)
      ? calculateAngle(rightShoulder, rightElbow, rightWrist)
      : 0;

    // Detect left arm punch
    const leftPunch = this.detectArmPunch(
      'left',
      leftWrist,
      leftElbowAngle,
      leftShoulder,
      rightShoulder,
      stance
    );

    // Detect right arm punch
    const rightPunch = this.detectArmPunch(
      'right',
      rightWrist,
      rightElbowAngle,
      leftShoulder,
      rightShoulder,
      stance
    );

    // Store current frame data for next frame comparison
    this.prevLeftWrist = { ...leftWrist };
    this.prevRightWrist = { ...rightWrist };
    this.prevLeftElbowAngle = leftElbowAngle;
    this.prevRightElbowAngle = rightElbowAngle;

    // Prefer the punch with higher extension if both detected
    if (leftPunch && rightPunch) {
      return leftPunch.elbowExtension > rightPunch.elbowExtension
        ? leftPunch
        : rightPunch;
    }

    return leftPunch ?? rightPunch ?? null;
  }

  private detectArmPunch(
    side: 'left' | 'right',
    wrist: Landmark,
    elbowAngle: number,
    leftShoulder: Landmark,
    rightShoulder: Landmark,
    stance: Stance
  ): PunchEvent | null {
    const prevWrist = side === 'left' ? this.prevLeftWrist : this.prevRightWrist;
    const cooldown = side === 'left' ? this.cooldownLeft : this.cooldownRight;
    const prevAngle = side === 'left' ? this.prevLeftElbowAngle : this.prevRightElbowAngle;

    if (cooldown > 0 || !prevWrist || wrist.visibility < VISIBILITY_THRESHOLD) {
      return null;
    }

    // Check for extension event: arm was bent, now extended
    const extending = elbowAngle >= PUNCH_EXTENSION_THRESHOLD && prevAngle < PUNCH_EXTENSION_THRESHOLD;
    if (!extending) return null;

    // Check velocity (wrist moved fast enough)
    const velocity = Math.sqrt(
      (wrist.x - prevWrist.x) ** 2 +
      (wrist.y - prevWrist.y) ** 2
    );

    if (velocity < PUNCH_VELOCITY_THRESHOLD) return null;

    // Set cooldown
    if (side === 'left') {
      this.cooldownLeft = PUNCH_COOLDOWN_FRAMES;
    } else {
      this.cooldownRight = PUNCH_COOLDOWN_FRAMES;
    }

    // Classify punch type
    const shoulderRotation = computeShoulderRotation(leftShoulder, rightShoulder);
    const type = classifyPunchType(side, wrist, prevWrist, leftShoulder, rightShoulder, stance);
    const quality = ratePunchQuality(elbowAngle, velocity);

    return {
      type,
      timestamp: performance.now(),
      elbowExtension: Math.round(elbowAngle),
      returnSpeed: 0, // Computed on return (future enhancement)
      shoulderRotation: Math.round(shoulderRotation),
      quality,
    };
  }
}

function allVisible(...landmarks: Landmark[]): boolean {
  return landmarks.every((l) => l.visibility >= VISIBILITY_THRESHOLD);
}

function computeShoulderRotation(leftShoulder: Landmark, rightShoulder: Landmark): number {
  if (!allVisible(leftShoulder, rightShoulder)) return 0;

  // Z-axis difference indicates shoulder rotation
  return Math.abs(leftShoulder.z - rightShoulder.z) * 100;
}

function classifyPunchType(
  side: 'left' | 'right',
  wrist: Landmark,
  prevWrist: Landmark,
  leftShoulder: Landmark,
  rightShoulder: Landmark,
  stance: Stance
): PunchType {
  const isLead =
    (stance === 'orthodox' && side === 'left') ||
    (stance === 'southpaw' && side === 'right') ||
    (stance === 'unknown' && side === 'left'); // default assumption

  // Vertical movement: upward = negative dy (y increases downward)
  const dy = wrist.y - prevWrist.y;
  const dx = wrist.x - prevWrist.x;

  // Uppercut: significant upward movement
  if (dy < -0.06) {
    return isLead ? 'lead_uppercut' : 'rear_uppercut';
  }

  // Hook: significant lateral movement relative to forward movement
  const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
  const lateralDist = Math.abs(wrist.x - shoulderCenter);
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);

  // If wrist is far to the side and moved mostly laterally, it's a hook
  if (lateralDist > shoulderWidth * 0.6 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    return isLead ? 'lead_hook' : 'rear_hook';
  }

  // Straight punches: jab (lead) or cross (rear)
  return isLead ? 'jab' : 'cross';
}

function ratePunchQuality(
  elbowExtension: number,
  velocity: number
): 'good' | 'fair' | 'poor' {
  // Good: full extension + fast
  if (elbowExtension >= 160 && velocity >= 0.07) return 'good';

  // Poor: weak extension or slow
  if (elbowExtension < 145 || velocity < 0.05) return 'poor';

  return 'fair';
}
