export const PoseLandmark = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type PoseLandmarkIndex = (typeof PoseLandmark)[keyof typeof PoseLandmark];

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type Stance = 'orthodox' | 'southpaw' | 'unknown';

export type PunchType =
  | 'jab'
  | 'cross'
  | 'lead_hook'
  | 'rear_hook'
  | 'lead_uppercut'
  | 'rear_uppercut';

export interface GuardScore {
  overall: number;
  leftHandHeight: number;
  rightHandHeight: number;
  elbowTuck: number;
  chinTuck: number;
}

export interface BaseScore {
  overall: number;
  footWidth: number;
  kneeFlex: number;
  weightDistribution: number;
}

export type PunchQuality = 'good' | 'fair' | 'poor';

export interface PunchEvent {
  type: PunchType;
  timestamp: number;
  elbowExtension: number;
  returnSpeed: number;
  shoulderRotation: number;
  quality: PunchQuality;
}

export interface FrameAngles {
  leftElbow: number | null;
  rightElbow: number | null;
  leftShoulder: number | null;
  rightShoulder: number | null;
  leftKnee: number | null;
  rightKnee: number | null;
}

export interface AnalysisFrame {
  timestamp: number;
  stance: Stance;
  guard: GuardScore;
  base: BaseScore;
  activePunch: PunchEvent | null;
  landmarks: Landmark[];
  angles: FrameAngles;
}

/**
 * A piece of user-visible text the engine wants to say, expressed as a
 * stable i18n key plus its interpolation data.
 *
 * The engine is pure, React-free and I/O-free — and that includes being
 * language-free. It never formats a sentence; it names one. The UI layer
 * (and the AI-coach payload builder) resolves the key against the active
 * locale. Tests assert keys, not prose.
 */
export interface SummaryNote {
  /** i18n key, e.g. `notes.correction.guardHandHeight`. */
  key: string;
  /** Interpolation values for the key, e.g. `{ count: 4 }`. */
  params?: Record<string, string | number>;
}

/** Summary of a single round (consumed by the gamification engine). */
export interface RoundSummary {
  number: number;
  durationMs: number;
  punchCount: number;
  avgGuardScore: number;
  avgBaseScore: number;
  punchQuality: Record<PunchQuality, number>;
}

export interface SessionSummary {
  duration: number;
  rounds: number;
  totalPunches: number;
  punchBreakdown: Record<PunchType, number>;
  avgGuardScore: number;
  avgBaseScore: number;
  /** Recurring issues, as i18n keys + `{ count }` (never formatted text). */
  corrections: SummaryNote[];
  /** Good moments, as i18n keys + params (never formatted text). */
  highlights: SummaryNote[];
  /**
   * Detailed fields for the gamification engine (F6). Optional for type
   * compatibility, but the SessionTracker always fills them in.
   */
  roundDetails?: RoundSummary[];
  punchQuality?: Record<PunchQuality, number>;
  punchQualityByType?: Record<PunchType, Record<PunchQuality, number>>;
}

export interface VoiceFeedback {
  /**
   * i18n key of the phrase to speak. Rules ship several interchangeable
   * variants per `ruleKey`; the engine picks which *key* to use, the UI
   * resolves it against the active locale.
   */
  messageKey: string;
  ruleKey: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  category: 'guard' | 'base' | 'punch' | 'general' | 'encouragement';
  cooldownMs: number;
  immediate?: boolean;
}
