import { describe, expect, it } from 'vitest';
import {
  computeRoundBonuses,
  computeSessionXp,
  levelFromTotalXp,
  levelUpCost,
  RANK_LABEL_KEYS,
  rankForLevel,
  rankLabelKey,
  totalXpForLevel,
  xpForPunch,
} from '../xp';
import { quality, round } from './fixtures';

describe('xpForPunch', () => {
  it('pays +10 good, +5 fair, +2 poor (SPECS §5)', () => {
    expect(xpForPunch('good')).toBe(10);
    expect(xpForPunch('fair')).toBe(5);
    expect(xpForPunch('poor')).toBe(2);
  });
});

describe('levels', () => {
  it('the cost of level N is 250×N (LVL 12→13 = 3000)', () => {
    expect(levelUpCost(1)).toBe(250);
    expect(levelUpCost(12)).toBe(3000);
  });

  it('the accumulated XP to reach a level is the sum of the previous costs', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(250);
    expect(totalXpForLevel(3)).toBe(750); // 250 + 500
    expect(totalXpForLevel(13)).toBe(19_500); // sum of 250×(1..12)
  });

  it('resolves the level on the exact XP boundaries', () => {
    expect(levelFromTotalXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNextLevel: 250 });
    expect(levelFromTotalXp(249)).toMatchObject({ level: 1, xpIntoLevel: 249 });
    expect(levelFromTotalXp(250)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: 500 });
    expect(levelFromTotalXp(749)).toMatchObject({ level: 2, xpIntoLevel: 499 });
    expect(levelFromTotalXp(750)).toMatchObject({ level: 3, xpIntoLevel: 0 });
  });

  it('negative or fractional XP does not break it (clamp + floor)', () => {
    expect(levelFromTotalXp(-50)).toMatchObject({ level: 1, xpIntoLevel: 0 });
    expect(levelFromTotalXp(250.9).level).toBe(2);
  });
});

describe('ranks', () => {
  it('maps levels on the exact boundaries: 1 Bronze · 10 Silver · 20 Gold · 35 Champion', () => {
    expect(rankForLevel(1)).toBe('bronze');
    expect(rankForLevel(9)).toBe('bronze');
    expect(rankForLevel(10)).toBe('silver');
    expect(rankForLevel(19)).toBe('silver');
    expect(rankForLevel(20)).toBe('gold');
    expect(rankForLevel(34)).toBe('gold');
    expect(rankForLevel(35)).toBe('champion');
    expect(rankForLevel(99)).toBe('champion');
  });

  it('the engine returns the rank KEY; theme and language resolve it in the UI', () => {
    expect(rankLabelKey(1)).toBe('ranks.bronze');
    expect(rankLabelKey(9)).toBe('ranks.bronze');
    expect(rankLabelKey(10)).toBe('ranks.silver');
    expect(rankLabelKey(20)).toBe('ranks.gold');
    expect(rankLabelKey(35)).toBe('ranks.champion');
  });

  it('every rank has a stable, unique key', () => {
    const keys = Object.values(RANK_LABEL_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [rank, key] of Object.entries(RANK_LABEL_KEYS)) {
      expect(key).toBe(`ranks.${rank}`);
    }
  });
});

describe('round bonus', () => {
  it('pays +30 with an average guard >= 80 and +20 with an average base >= 80 (exact boundary)', () => {
    const bonuses = computeRoundBonuses([
      round({ number: 1, avgGuardScore: 80, avgBaseScore: 80 }),
      round({ number: 2, avgGuardScore: 79.99, avgBaseScore: 80 }),
      round({ number: 3, avgGuardScore: 79.99, avgBaseScore: 79.99 }),
    ]);
    expect(bonuses).toEqual([
      { round: 1, guardBonus: 30, baseBonus: 20 },
      { round: 2, guardBonus: 0, baseBonus: 20 },
    ]);
  });
});

describe('computeSessionXp', () => {
  it('adds punch XP and round bonus together', () => {
    const xp = computeSessionXp(quality(3, 2, 1), [
      round({ avgGuardScore: 85, avgBaseScore: 70 }),
    ]);
    expect(xp.punchXp).toBe(3 * 10 + 2 * 5 + 1 * 2); // 42
    expect(xp.roundBonusXp).toBe(30);
    expect(xp.total).toBe(72);
  });

  it('a session with no punches and no good rounds is worth 0 XP', () => {
    const xp = computeSessionXp(quality(), [round({ avgGuardScore: 50, avgBaseScore: 50 })]);
    expect(xp.total).toBe(0);
  });
});
