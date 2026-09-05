import type { PunchQuality, PunchType, SessionSummary } from '../types';
import { evaluateBadges, type BadgeDefinition } from './badges';
import { advanceStreak } from './streak';
import { localDateKey } from './streak';
import { questStatuses, type QuestStatus } from './quests';
import {
  computeSessionXp,
  levelFromTotalXp,
  rankForLevel,
  type LevelProgress,
  type RankId,
  type SessionXpBreakdown,
} from './xp';
import {
  MAX_STORED_SESSIONS,
  type DailyAggregate,
  type ProfileHistory,
  type SessionRecord,
} from './types';

/**
 * Core of the gamification engine: applies a finished session to a
 * ProfileHistory, producing the new history and the session's gains (XP,
 * level, new badges, quests). A pure function: persistence belongs to the
 * HistoryStore and the clock comes in as a parameter.
 */

export interface SessionGains {
  record: SessionRecord;
  /** Punch XP + round bonus. */
  xp: SessionXpBreakdown;
  /** XP from quests completed in this session. */
  questXp: number;
  /** Total XP credited by the session (xp.total + questXp). */
  totalSessionXp: number;
  levelBefore: LevelProgress;
  levelAfter: LevelProgress;
  leveledUp: boolean;
  rankBefore: RankId;
  rankAfter: RankId;
  newBadges: BadgeDefinition[];
  /** The day's quests with post-session progress (always all 3). */
  quests: QuestStatus[];
  /** The subset of `quests` completed by THIS session. */
  completedQuests: QuestStatus[];
  /** Streak (consecutive days) after the session. */
  streakCount: number;
}

export interface ApplySessionOptions {
  /** Epoch ms of the end of the session (wall clock). Defaults to Date.now(). */
  now?: number;
  sessionId?: string;
  coachFeedback?: string | null;
}

function emptyQuality(): Record<PunchQuality, number> {
  return { good: 0, fair: 0, poor: 0 };
}

function emptyQualityByType(): Record<PunchType, Record<PunchQuality, number>> {
  return {
    jab: emptyQuality(),
    cross: emptyQuality(),
    lead_hook: emptyQuality(),
    rear_hook: emptyQuality(),
    lead_uppercut: emptyQuality(),
    rear_uppercut: emptyQuality(),
  };
}

function emptyDaily(dateKey: string): DailyAggregate {
  return {
    dateKey,
    sessions: 0,
    rounds: 0,
    totalPunches: 0,
    goodPunches: 0,
    punchQualityByType: emptyQualityByType(),
    scoreSum: 0,
    bestRoundGuard: 0,
    bestRoundBase: 0,
    xpGained: 0,
  };
}

function newSessionId(now: number): string {
  return `s-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Applies a finished session to the history. Returns the new history (a
 * new object; the input is never mutated) and the gains for the UI.
 */
export function applySession(
  history: ProfileHistory,
  summary: SessionSummary,
  options: ApplySessionOptions = {}
): { history: ProfileHistory; gains: SessionGains } {
  const now = options.now ?? Date.now();
  const dateKey = localDateKey(now);

  const roundDetails = summary.roundDetails ?? [];
  const punchQuality = summary.punchQuality ?? emptyQuality();
  const punchQualityByType = summary.punchQualityByType ?? emptyQualityByType();

  // 1) The session's XP (punches + round bonus), SPECS §5.
  const xp = computeSessionXp(punchQuality, roundDetails);

  // 2) The day's aggregate (feeds the quests and the weekly chart).
  const previousDay = history.dailyAggregates[dateKey] ?? emptyDaily(dateKey);
  const day: DailyAggregate = {
    ...previousDay,
    punchQualityByType: emptyQualityByType(),
    sessions: previousDay.sessions + 1,
    rounds: previousDay.rounds + summary.rounds,
    totalPunches: previousDay.totalPunches + summary.totalPunches,
    goodPunches: previousDay.goodPunches + punchQuality.good,
    scoreSum: previousDay.scoreSum + (summary.avgGuardScore + summary.avgBaseScore) / 2,
    bestRoundGuard: Math.max(
      previousDay.bestRoundGuard,
      ...roundDetails.map((r) => r.avgGuardScore)
    ),
    bestRoundBase: Math.max(
      previousDay.bestRoundBase,
      ...roundDetails.map((r) => r.avgBaseScore)
    ),
  };
  for (const type of Object.keys(day.punchQualityByType) as PunchType[]) {
    for (const quality of ['good', 'fair', 'poor'] as PunchQuality[]) {
      day.punchQualityByType[type][quality] =
        previousDay.punchQualityByType[type][quality] +
        punchQualityByType[type][quality];
    }
  }

  // 3) The day's quests: complete the ones that crossed the target in this session.
  const alreadyCompleted = history.completedQuests[dateKey] ?? [];
  const quests = questStatuses(dateKey, day, alreadyCompleted);
  const completedQuests = quests.filter(
    (q) => q.done && !alreadyCompleted.includes(q.quest.id)
  );
  const questXp = completedQuests.reduce((s, q) => s + q.quest.xp, 0);

  // 4) Total XP credited; the session record.
  const totalSessionXp = xp.total + questXp;
  day.xpGained += totalSessionXp;

  const record: SessionRecord = {
    id: options.sessionId ?? newSessionId(now),
    profileId: history.profileId,
    startedAt: now - Math.round(summary.duration),
    endedAt: now,
    dateKey,
    durationMs: Math.round(summary.duration),
    rounds: summary.rounds,
    totalPunches: summary.totalPunches,
    punchBreakdown: { ...summary.punchBreakdown },
    punchQuality: { ...punchQuality },
    punchQualityByType,
    avgGuardScore: summary.avgGuardScore,
    avgBaseScore: summary.avgBaseScore,
    roundDetails: roundDetails.map((r) => ({ ...r, punchQuality: { ...r.punchQuality } })),
    xpGained: totalSessionXp,
    coachFeedback: options.coachFeedback ?? null,
  };

  // 5) Totals, streak and level.
  const lifetime = {
    sessions: history.lifetime.sessions + 1,
    rounds: history.lifetime.rounds + summary.rounds,
    punches: history.lifetime.punches + summary.totalPunches,
    goodPunches: history.lifetime.goodPunches + punchQuality.good,
  };
  const streak = advanceStreak(history.streak, dateKey);

  const levelBefore = levelFromTotalXp(history.totalXp);
  const totalXp = history.totalXp + totalSessionXp;
  const levelAfter = levelFromTotalXp(totalXp);

  // 6) Permanent badges (evaluated against the already updated state).
  const unlockedIds = new Set(history.unlockedBadges.map((b) => b.id));
  const newBadges = evaluateBadges(
    { session: record, lifetime, streakCount: streak.count },
    unlockedIds
  );

  const nextHistory: ProfileHistory = {
    ...history,
    totalXp,
    lifetime,
    streak,
    unlockedBadges: [
      ...history.unlockedBadges,
      ...newBadges.map((b) => ({ id: b.id, unlockedAt: now })),
    ],
    sessions: [...history.sessions, record].slice(-MAX_STORED_SESSIONS),
    dailyAggregates: { ...history.dailyAggregates, [dateKey]: day },
    completedQuests:
      completedQuests.length > 0
        ? {
            ...history.completedQuests,
            [dateKey]: [...alreadyCompleted, ...completedQuests.map((q) => q.quest.id)],
          }
        : history.completedQuests,
  };

  const gains: SessionGains = {
    record,
    xp,
    questXp,
    totalSessionXp,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter.level > levelBefore.level,
    rankBefore: rankForLevel(levelBefore.level),
    rankAfter: rankForLevel(levelAfter.level),
    newBadges,
    quests,
    completedQuests,
    streakCount: streak.count,
  };

  return { history: nextHistory, gains };
}
