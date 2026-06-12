import type { PunchQuality, RoundSummary } from '../types';
import type { Theme } from '../../theme/theme';

/**
 * Regras de XP, níveis e ranks (SPECS §5).
 * Funções puras — nenhuma dependência de DOM/storage.
 */

/** XP por golpe, pela qualidade classificada pelo engine. */
export const XP_PER_PUNCH: Record<PunchQuality, number> = {
  good: 10,
  fair: 5,
  poor: 2,
};

/** Bônus por round: guarda média >= 80 → +30; base média >= 80 → +20. */
export const ROUND_BONUS_THRESHOLD = 80;
export const GUARD_ROUND_BONUS_XP = 30;
export const BASE_ROUND_BONUS_XP = 20;

/** Custo p/ sair do nível N rumo ao N+1 = 250 × N XP (LVL 12→13 = 3.000). */
export const LEVEL_COST_FACTOR = 250;

export function xpForPunch(quality: PunchQuality): number {
  return XP_PER_PUNCH[quality];
}

/** XP necessário p/ avançar do nível `level` para `level + 1`. */
export function levelUpCost(level: number): number {
  return LEVEL_COST_FACTOR * Math.max(1, Math.floor(level));
}

/**
 * XP acumulado necessário p/ alcançar o nível `level` partindo do 1.
 * Soma de 250×n para n=1..level-1 = 125 × level × (level - 1).
 */
export function totalXpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 125 * l * (l - 1);
}

export interface LevelProgress {
  level: number;
  /** XP já acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP total do nível atual (custo p/ subir). */
  xpForNextLevel: number;
  totalXp: number;
}

/** Resolve nível e progresso a partir do XP total acumulado. */
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

/** Nível mínimo de cada rank (SPECS §5): 1 / 10 / 20 / 35. */
export const RANK_MIN_LEVEL: Record<RankId, number> = {
  bronze: 1,
  silver: 10,
  gold: 20,
  champion: 35,
};

const RANK_ORDER: RankId[] = ['champion', 'gold', 'silver', 'bronze'];

/** Nomes por tema: cinturões no adulto, coroas no kids (UI kids chega no F7). */
export const RANK_LABELS: Record<Theme, Record<RankId, string>> = {
  adult: {
    bronze: 'Cinturão Bronze',
    silver: 'Cinturão Prata',
    gold: 'Cinturão Ouro',
    champion: 'Campeão',
  },
  kids: {
    bronze: 'Coroa de Bronze',
    silver: 'Coroa de Prata',
    gold: 'Coroa de Ouro',
    champion: 'Rainha do Ringue',
  },
};

export function rankForLevel(level: number): RankId {
  for (const rank of RANK_ORDER) {
    if (level >= RANK_MIN_LEVEL[rank]) return rank;
  }
  return 'bronze';
}

export function rankLabel(level: number, theme: Theme = 'adult'): string {
  return RANK_LABELS[theme][rankForLevel(level)];
}

/* ------------------------------------------------------------ sessão/XP */

export interface RoundBonus {
  round: number;
  guardBonus: number;
  baseBonus: number;
}

export interface SessionXpBreakdown {
  punchXp: number;
  roundBonusXp: number;
  bonuses: RoundBonus[];
  /** punchXp + roundBonusXp (missões são somadas à parte). */
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

/** XP de uma sessão a partir das qualidades de golpe e dos rounds. */
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
