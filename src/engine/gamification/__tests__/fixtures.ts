import type {
  PunchQuality,
  PunchType,
  RoundSummary,
  SessionSummary,
} from '../../types';
import type { DailyAggregate, LifetimeTotals, SessionRecord } from '../types';

export function quality(good = 0, fair = 0, poor = 0): Record<PunchQuality, number> {
  return { good, fair, poor };
}

export function qualityByType(
  partial: Partial<Record<PunchType, Record<PunchQuality, number>>> = {}
): Record<PunchType, Record<PunchQuality, number>> {
  return {
    jab: quality(),
    cross: quality(),
    lead_hook: quality(),
    rear_hook: quality(),
    lead_uppercut: quality(),
    rear_uppercut: quality(),
    ...partial,
  };
}

export function breakdown(
  partial: Partial<Record<PunchType, number>> = {}
): Record<PunchType, number> {
  return {
    jab: 0,
    cross: 0,
    lead_hook: 0,
    rear_hook: 0,
    lead_uppercut: 0,
    rear_uppercut: 0,
    ...partial,
  };
}

export function round(overrides: Partial<RoundSummary> = {}): RoundSummary {
  return {
    number: 1,
    durationMs: 180_000,
    punchCount: 10,
    avgGuardScore: 75,
    avgBaseScore: 75,
    punchQuality: quality(10),
    ...overrides,
  };
}

export function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    duration: 180_000,
    rounds: 1,
    totalPunches: 10,
    punchBreakdown: breakdown({ jab: 10 }),
    avgGuardScore: 75,
    avgBaseScore: 75,
    corrections: [],
    highlights: [],
    roundDetails: [round()],
    punchQuality: quality(10),
    punchQualityByType: qualityByType({ jab: quality(10) }),
    ...overrides,
  };
}

export function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's-test',
    profileId: 'default',
    startedAt: 0,
    endedAt: 180_000,
    dateKey: '2026-06-11',
    durationMs: 180_000,
    rounds: 1,
    totalPunches: 10,
    punchBreakdown: breakdown({ jab: 10 }),
    punchQuality: quality(10),
    punchQualityByType: qualityByType({ jab: quality(10) }),
    avgGuardScore: 75,
    avgBaseScore: 75,
    roundDetails: [round()],
    xpGained: 100,
    coachFeedback: null,
    ...overrides,
  };
}

export function lifetime(overrides: Partial<LifetimeTotals> = {}): LifetimeTotals {
  return { sessions: 1, rounds: 1, punches: 10, goodPunches: 10, ...overrides };
}

export function daily(overrides: Partial<DailyAggregate> = {}): DailyAggregate {
  return {
    dateKey: '2026-06-11',
    sessions: 1,
    rounds: 1,
    totalPunches: 10,
    goodPunches: 10,
    punchQualityByType: qualityByType({ jab: quality(10) }),
    scoreSum: 75,
    bestRoundGuard: 75,
    bestRoundBase: 75,
    xpGained: 100,
    ...overrides,
  };
}
