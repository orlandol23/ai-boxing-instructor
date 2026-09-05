import type { PunchQuality, RoundSummary } from '../types';

/**
 * XP, level and rank rules (SPECS §5).
 * Pure functions, with no DOM or storage dependency.
 */

/** XP per punch, by the quality the engine classified it with. */
export const XP_PER_PUNCH: Record<PunchQuality, number> = {
  good: 10,
  fair: 5,
  poor: 2,
};

/** Round bonus: average guard >= 80 gives +30; average base >= 80 gives +20. */
export const ROUND_BONUS_THRESHOLD = 80;
export const GUARD_ROUND_BONUS_XP = 30;
export const BASE_ROUND_BONUS_XP = 20;

/** Cost of leaving level N for N+1 = 250 × N XP (LVL 12→13 = 3,000). */
export const LEVEL_COST_FACTOR = 250;

export function xpForPunch(quality: PunchQuality): number {
  return XP_PER_PUNCH[quality];
}

/** XP needed to move from `level` to `level + 1`. */
export function levelUpCost(level: number): number {
  return LEVEL_COST_FACTOR * Math.max(1, Math.floor(level));
}

/**
 * Accumulated XP needed to reach `level` starting from 1.
 * Sum of 250×n for n=1..level-1 = 125 × level × (level - 1).
 */
export function totalXpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 125 * l * (l - 1);
}

export interface LevelProgress {
  level: number;
  /** XP already accumulated inside the current level. */
  xpIntoLevel: number;
  /** Total XP of the current level (the cost of moving up). */
  xpForNextLevel: number;
  totalXp: number;
}

/** Resolves level and progress from the total accumulated XP. */
export function levelFromTotalXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level += 1;
  return {
    level,
    xpIntoLevel: xp - totalXpForLevel(level),
    xpForNextLevel: levelUpCost(level),
    totalXp: xp,
  };
}

/* ---------------------------------------------------------------- ranks */

export type RankId = 'bronze' | 'silver' | 'gold' | 'champion';

/** Minimum level of each rank (SPECS §5): 1 / 10 / 20 / 35. */
export const RANK_MIN_LEVEL: Record<RankId, number> = {
  bronze: 1,
  silver: 10,
  gold: 20,
  champion: 35,
};

const RANK_ORDER: RankId[] = ['champion', 'gold', 'silver', 'bronze'];

/**
 * i18n key per rank. The base key is the adult skin (belts); the `_kids`
 * variant of the same key is the Arcade Royale skin (crowns) — resolved
 * by `rankLabel()` in `src/theme/copy.ts`, never here.
 */
export const RANK_LABEL_KEYS: Record<RankId, string> = {
  bronze: 'ranks.bronze',
  silver: 'ranks.silver',
  gold: 'ranks.gold',
  champion: 'ranks.champion',
};

export function rankForLevel(level: number): RankId {
  for (const rank of RANK_ORDER) {
    if (level >= RANK_MIN_LEVEL[rank]) return rank;
  }
  return 'bronze';
}

/** Stable i18n key for the rank a level belongs to. */
export function rankLabelKey(level: number): string {
  return RANK_LABEL_KEYS[rankForLevel(level)];
}

/* ----------------------------------------------------------- session/XP */

export interface RoundBonus {
  round: number;
  guardBonus: number;
  baseBonus: number;
}

export interface SessionXpBreakdown {
  punchXp: number;
  roundBonusXp: number;
  bonuses: RoundBonus[];
  /** punchXp + roundBonusXp (quest XP is added separately). */
  total: number;
}

export function computeRoundBonuses(rounds: readonly RoundSummary[]): RoundBonus[] {
  const bonuses: RoundBonus[] = [];
  for (const r of rounds) {
    const guardBonus = r.avgGuardScore >= ROUND_BONUS_THRESHOLD ? GUARD_ROUND_BONUS_XP : 0;
    const baseBonus = r.avgBaseScore >= ROUND_BONUS_THRESHOLD ? BASE_ROUND_BONUS_XP : 0;
    if (guardBonus > 0 || baseBonus > 0) {
      bonuses.push({ round: r.number, guardBonus, baseBonus });
    }
  }
  return bonuses;
}

/** A session's XP, from the punch qualities and the rounds. */
export function computeSessionXp(
  punchQuality: Record<PunchQuality, number>,
  rounds: readonly RoundSummary[]
): SessionXpBreakdown {
  const punchXp =
    punchQuality.good * XP_PER_PUNCH.good +
    punchQuality.fair * XP_PER_PUNCH.fair +
    punchQuality.poor * XP_PER_PUNCH.poor;

  const bonuses = computeRoundBonuses(rounds);
  const roundBonusXp = bonuses.reduce((s, b) => s + b.guardBonus + b.baseBonus, 0);

  return { punchXp, roundBonusXp, bonuses, total: punchXp + roundBonusXp };
}
