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
 * Núcleo do motor de gamificação: aplica uma sessão concluída a um
 * ProfileHistory, produzindo o novo histórico e os ganhos da sessão
 * (XP, nível, badges novas, missões). Função pura — persistência fica
 * no HistoryStore; relógio entra por parâmetro.
 */

export interface SessionGains {
  record: SessionRecord;
  /** XP de golpes + bônus de round. */
  xp: SessionXpBreakdown;
  /** XP de missões completadas nesta sessão. */
  questXp: number;
  /** XP total creditado pela sessão (xp.total + questXp). */
  totalSessionXp: number;
  levelBefore: LevelProgress;
  levelAfter: LevelProgress;
  leveledUp: boolean;
  rankBefore: RankId;
  rankAfter: RankId;
  newBadges: BadgeDefinition[];
  /** Missões do dia com progresso pós-sessão (sempre as 3). */
  quests: QuestStatus[];
  /** Subconjunto de `quests` completado por ESTA sessão. */
  completedQuests: QuestStatus[];
  /** Streak (dias consecutivos) após a sessão. */
  streakCount: number;
}

export interface ApplySessionOptions {
  /** Epoch ms do fim da sessão (relógio de parede). Default: Date.now(). */
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
 * Aplica uma sessão concluída ao histórico. Retorna o novo histórico
 * (objeto novo; o de entrada não é mutado) e os ganhos para a UI.
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

  // 1) XP da sessão (golpes + bônus de round) — SPECS §5.
  const xp = computeSessionXp(punchQuality, roundDetails);

  // 2) Agregado do dia (alimenta missões e o gráfico semanal).
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

  // 3) Missões do dia: completa as que cruzaram o alvo nesta sessão.
  const alreadyCompleted = history.completedQuests[dateKey] ?? [];
  const quests = questStatuses(dateKey, day, alreadyCompleted);
  const completedQuests = quests.filter(
    (q) => q.done && !alreadyCompleted.includes(q.quest.id)
  );
  const questXp = completedQuests.reduce((s, q) => s + q.quest.xp, 0);

  // 4) XP total creditado; registro da sessão.
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

  // 5) Totais, streak e nível.
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

  // 6) Badges permanentes (avaliadas com o estado já atualizado).
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
