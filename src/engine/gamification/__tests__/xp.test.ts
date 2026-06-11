import { describe, expect, it } from 'vitest';
import {
  computeRoundBonuses,
  computeSessionXp,
  levelFromTotalXp,
  levelUpCost,
  rankForLevel,
  rankLabel,
  totalXpForLevel,
  xpForPunch,
} from '../xp';
import { quality, round } from './fixtures';

describe('xpForPunch', () => {
  it('paga +10 good, +5 fair, +2 poor (SPECS §5)', () => {
    expect(xpForPunch('good')).toBe(10);
    expect(xpForPunch('fair')).toBe(5);
    expect(xpForPunch('poor')).toBe(2);
  });
});

describe('níveis', () => {
  it('custo do nível N é 250×N (LVL 12→13 = 3000)', () => {
    expect(levelUpCost(1)).toBe(250);
    expect(levelUpCost(12)).toBe(3000);
  });

  it('XP acumulado para alcançar um nível é a soma dos custos anteriores', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(250);
    expect(totalXpForLevel(3)).toBe(750); // 250 + 500
    expect(totalXpForLevel(13)).toBe(19_500); // soma 250×(1..12)
  });

  it('resolve o nível nas fronteiras exatas de XP', () => {
    expect(levelFromTotalXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNextLevel: 250 });
    expect(levelFromTotalXp(249)).toMatchObject({ level: 1, xpIntoLevel: 249 });
    expect(levelFromTotalXp(250)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: 500 });
    expect(levelFromTotalXp(749)).toMatchObject({ level: 2, xpIntoLevel: 499 });
    expect(levelFromTotalXp(750)).toMatchObject({ level: 3, xpIntoLevel: 0 });
  });

  it('XP negativo ou fracionário não quebra (clamp + floor)', () => {
    expect(levelFromTotalXp(-50)).toMatchObject({ level: 1, xpIntoLevel: 0 });
    expect(levelFromTotalXp(250.9).level).toBe(2);
  });
});

describe('ranks', () => {
  it('mapeia níveis nas fronteiras exatas: 1 Bronze · 10 Prata · 20 Ouro · 35 Campeão', () => {
    expect(rankForLevel(1)).toBe('bronze');
    expect(rankForLevel(9)).toBe('bronze');
    expect(rankForLevel(10)).toBe('silver');
    expect(rankForLevel(19)).toBe('silver');
    expect(rankForLevel(20)).toBe('gold');
    expect(rankForLevel(34)).toBe('gold');
    expect(rankForLevel(35)).toBe('champion');
    expect(rankForLevel(99)).toBe('champion');
  });

  it('nome do rank vem do tema (kids preparado p/ F7)', () => {
    expect(rankLabel(1)).toBe('Cinturão Bronze');
    expect(rankLabel(35, 'adult')).toBe('Campeão');
    expect(rankLabel(35, 'kids')).toBe('Rainha do Ringue');
  });
});

describe('bônus de round', () => {
  it('paga +30 com guarda média ≥ 80 e +20 com base média ≥ 80 (fronteira exata)', () => {
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
  it('soma XP de golpes e bônus de round', () => {
    const xp = computeSessionXp(quality(3, 2, 1), [
      round({ avgGuardScore: 85, avgBaseScore: 70 }),
    ]);
    expect(xp.punchXp).toBe(3 * 10 + 2 * 5 + 1 * 2); // 42
    expect(xp.roundBonusXp).toBe(30);
    expect(xp.total).toBe(72);
  });

  it('sessão sem golpes nem rounds bons vale 0 XP', () => {
    const xp = computeSessionXp(quality(), [round({ avgGuardScore: 50, avgBaseScore: 50 })]);
    expect(xp.total).toBe(0);
  });
});
