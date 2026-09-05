import type { PunchQuality, PunchType } from '../types';
import type { DailyAggregate } from './types';

/**
 * Daily quests (SPECS §5): 3 per day, drawn deterministically from a fixed
 * pool with a seed derived from the local date (YYYY-MM-DD), so the same
 * day always produces the same quests and the draw never has to be
 * persisted.
 *
 * Progress is measured against the day's aggregate (several sessions on
 * the same day accumulate), and completion is recorded in
 * `ProfileHistory.completedQuests[dateKey]` so the XP is never paid twice.
 */

export interface QuestDefinition {
  id: string;
  /**
   * i18n key of the quest description. The base key holds the adult copy;
   * the `_kids` variant of the same key holds the RPG skin — same goal,
   * same metric, different narration. Resolved in `src/theme/copy.ts`.
   */
  descriptionKey: string;
  /** XP reward on completion. */
  xp: number;
  /** Target value of `progress` for completion. */
  target: number;
  progress(day: DailyAggregate): number;
}

function countOf(day: DailyAggregate, type: PunchType, quality?: PunchQuality): number {
  const q = day.punchQualityByType[type];
  if (!q) return 0;
  return quality ? q[quality] : q.good + q.fair + q.poor;
}

/**
 * Fixed pool with stable ids (they are persisted in completedQuests).
 * Copy lives in `src/i18n/locales/*` under `quests.<id>.description`.
 */
export const QUEST_POOL: readonly QuestDefinition[] = [
  {
    id: 'jabs_good_30',
    descriptionKey: 'quests.jabs_good_30.description',
    xp: 50,
    target: 30,
    progress: (d) => countOf(d, 'jab', 'good'),
  },
  {
    id: 'crosses_good_20',
    descriptionKey: 'quests.crosses_good_20.description',
    xp: 50,
    target: 20,
    progress: (d) => countOf(d, 'cross', 'good'),
  },
  {
    id: 'hooks_20',
    descriptionKey: 'quests.hooks_20.description',
    xp: 45,
    target: 20,
    progress: (d) => countOf(d, 'lead_hook') + countOf(d, 'rear_hook'),
  },
  {
    id: 'punches_100',
    descriptionKey: 'quests.punches_100.description',
    xp: 60,
    target: 100,
    progress: (d) => d.totalPunches,
  },
  {
    id: 'good_punches_50',
    descriptionKey: 'quests.good_punches_50.description',
    xp: 60,
    target: 50,
    progress: (d) => d.goodPunches,
  },
  {
    id: 'rounds_3',
    descriptionKey: 'quests.rounds_3.description',
    xp: 40,
    target: 3,
    progress: (d) => d.rounds,
  },
  {
    id: 'guard_80_round',
    descriptionKey: 'quests.guard_80_round.description',
    xp: 50,
    target: 1,
    progress: (d) => (d.bestRoundGuard >= 80 ? 1 : 0),
  },
  {
    id: 'base_80_round',
    descriptionKey: 'quests.base_80_round.description',
    xp: 40,
    target: 1,
    progress: (d) => (d.bestRoundBase >= 80 ? 1 : 0),
  },
];

export const QUESTS_PER_DAY = 3;

/** 32-bit FNV-1a hash of the date key, used as the PRNG seed. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic mulberry32 PRNG, enough for drawing quests. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 3 quests for the day `dateKey` (deterministic, no repeats). */
export function dailyQuests(dateKey: string): QuestDefinition[] {
  const rand = mulberry32(hashSeed(dateKey));
  const pool = [...QUEST_POOL];
  const picked: QuestDefinition[] = [];
  for (let i = 0; i < Math.min(QUESTS_PER_DAY, pool.length); i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picked.push(pool[i]);
  }
  return picked;
}

export interface QuestStatus {
  quest: QuestDefinition;
  /** Current progress, capped at the target. */
  progress: number;
  done: boolean;
}

/** Status of the day's quests against the aggregate (absent = a day with no training). */
export function questStatuses(
  dateKey: string,
  day: DailyAggregate | undefined,
  completedIds: readonly string[] = []
): QuestStatus[] {
  return dailyQuests(dateKey).map((quest) => {
    const raw = day ? quest.progress(day) : 0;
    const progress = Math.min(quest.target, Math.max(0, raw));
    // A recorded completion is permanent for the day, even if the metric swings.
    const done = completedIds.includes(quest.id) || progress >= quest.target;
    return { quest, progress: done ? quest.target : progress, done };
  });
}
