import { currentStreak, localDateKey, previousDateKey } from './streak';
import { questStatuses, type QuestStatus } from './quests';
import { levelFromTotalXp, rankForLevel, type LevelProgress, type RankId } from './xp';
import type { ProfileHistory } from './types';

/**
 * Seletores de leitura para a UI (Home, /progress, resumo) — derivam
 * tudo do ProfileHistory persistido, sem estado próprio.
 */

export interface ProgressSnapshot {
  level: LevelProgress;
  rank: RankId;
  /** Streak vigente hoje (0 se expirou à meia-noite local). */
  streak: number;
  /** Missões de hoje com progresso. */
  quests: QuestStatus[];
  questsDone: number;
}

export function progressSnapshot(
  history: ProfileHistory,
  now: number = Date.now()
): ProgressSnapshot {
  const today = localDateKey(now);
  const quests = questStatuses(
    today,
    history.dailyAggregates[today],
    history.completedQuests[today] ?? []
  );
  const level = levelFromTotalXp(history.totalXp);
  return {
    level,
    rank: rankForLevel(level.level),
    streak: currentStreak(history.streak, today),
    quests,
    questsDone: quests.filter((q) => q.done).length,
  };
}

export interface WeeklyDay {
  dateKey: string;
  /** i18n key of the short weekday label (`weekday.mon`, …). */
  labelKey: string;
  isToday: boolean;
  sessions: number;
  totalPunches: number;
  /** Score médio do dia ((guarda+base)/2 por sessão) ou null sem treino. */
  avgScore: number | null;
}

/** Indexed by `Date#getDay()` (0 = Sunday). */
export const WEEKDAY_LABEL_KEYS = [
  'weekday.sun',
  'weekday.mon',
  'weekday.tue',
  'weekday.wed',
  'weekday.thu',
  'weekday.fri',
  'weekday.sat',
];

/** Os últimos 7 dias locais (hoje incluso, à direita) p/ o gráfico semanal. */
export function weeklyChartData(
  history: ProfileHistory,
  now: number = Date.now()
): WeeklyDay[] {
  const keys: string[] = [];
  let key = localDateKey(now);
  for (let i = 0; i < 7; i++) {
    keys.unshift(key);
    key = previousDateKey(key);
  }

  return keys.map((dateKey, i) => {
    const day = history.dailyAggregates[dateKey];
    const [y, m, d] = dateKey.split('-').map(Number);
    const weekday = new Date(y, m - 1, d, 12).getDay();
    return {
      dateKey,
      labelKey: WEEKDAY_LABEL_KEYS[weekday],
      isToday: i === 6,
      sessions: day?.sessions ?? 0,
      totalPunches: day?.totalPunches ?? 0,
      avgScore: day && day.sessions > 0 ? day.scoreSum / day.sessions : null,
    };
  });
}
