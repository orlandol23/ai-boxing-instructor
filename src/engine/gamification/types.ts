import type { PunchQuality, PunchType, RoundSummary } from '../types';

/** This phase's implicit profile. F7 (multiple profiles) reuses the field. */
export const DEFAULT_PROFILE_ID = 'default';

/** Persisted record of a finished session. */
export interface SessionRecord {
  id: string;
  profileId: string;
  /** Epoch ms (wall clock), used by time-of-day badges. */
  startedAt: number;
  endedAt: number;
  /** The session's local day, as YYYY-MM-DD. */
  dateKey: string;
  durationMs: number;
  rounds: number;
  totalPunches: number;
  punchBreakdown: Record<PunchType, number>;
  punchQuality: Record<PunchQuality, number>;
  punchQualityByType: Record<PunchType, Record<PunchQuality, number>>;
  avgGuardScore: number;
  avgBaseScore: number;
  roundDetails: RoundSummary[];
  /** Total XP earned in the session (punches + round bonus + quests). */
  xpGained: number;
  /** The session's AI coach feedback, when there is one. */
  coachFeedback: string | null;
}

/** Aggregate of one local day. Feeds the weekly chart and the quests. */
export interface DailyAggregate {
  dateKey: string;
  sessions: number;
  rounds: number;
  totalPunches: number;
  goodPunches: number;
  punchQualityByType: Record<PunchType, Record<PunchQuality, number>>;
  /** Sum of the composite score ((guard+base)/2) per session; average = /sessions. */
  scoreSum: number;
  bestRoundGuard: number;
  bestRoundBase: number;
  xpGained: number;
}

export interface StreakState {
  /** Consecutive days with >= 1 session (counting the last day trained). */
  count: number;
  /** Last local day with a session (YYYY-MM-DD), or null. */
  lastDate: string | null;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: number;
}

export interface LifetimeTotals {
  sessions: number;
  rounds: number;
  punches: number;
  goodPunches: number;
}

export const HISTORY_SCHEMA_VERSION = 1;

/**
 * A profile's history/progress document, the unit the HistoryStore
 * persists. Versioned for schema migration (F6b: Neon).
 */
export interface ProfileHistory {
  schemaVersion: number;
  profileId: string;
  totalXp: number;
  lifetime: LifetimeTotals;
  streak: StreakState;
  unlockedBadges: UnlockedBadge[];
  /** Most recent sessions last; capped at MAX_STORED_SESSIONS. */
  sessions: SessionRecord[];
  dailyAggregates: Record<string, DailyAggregate>;
  /** dateKey -> ids of the quests already completed on that day. */
  completedQuests: Record<string, string[]>;
}

/** Cap on stored detailed sessions (daily aggregates never expire). */
export const MAX_STORED_SESSIONS = 200;

export function emptyLifetime(): LifetimeTotals {
  return { sessions: 0, rounds: 0, punches: 0, goodPunches: 0 };
}

export function emptyHistory(profileId: string = DEFAULT_PROFILE_ID): ProfileHistory {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    profileId,
    totalXp: 0,
    lifetime: emptyLifetime(),
    streak: { count: 0, lastDate: null },
    unlockedBadges: [],
    sessions: [],
    dailyAggregates: {},
    completedQuests: {},
  };
}
