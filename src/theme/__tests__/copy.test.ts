import { describe, expect, it } from 'vitest';
import {
  KIDS_BADGE_NAMES,
  KIDS_QUEST_COPY,
  badgeName,
  homeGreeting,
  questDescription,
  uiCopy,
} from '../copy';
import { QUEST_POOL } from '../../engine/gamification/quests';
import { BADGES } from '../../engine/gamification/badges';
import { RANK_LABELS, rankLabel } from '../../engine/gamification/xp';

describe('copy por tema — missões diárias', () => {
  it('adult usa a descrição do motor; kids usa a skin RPG', () => {
    const guard = QUEST_POOL.find((q) => q.id === 'guard_80_round')!;
    expect(questDescription(guard, 'adult')).toBe('Feche um round com guarda média ≥ 80');
    expect(questDescription(guard, 'kids')).toBe('Defenda o castelo: guarda ≥ 80 no round');
  });

  it('TODA missão do pool tem skin kids (nada cai em copy adulta por engano)', () => {
    for (const quest of QUEST_POOL) {
      expect(KIDS_QUEST_COPY[quest.id], `skin kids faltando p/ ${quest.id}`).toBeTruthy();
      expect(questDescription(quest, 'kids')).not.toBe(quest.description);
    }
  });

  it('missão futura sem skin cai na copy adulta (nunca quebra)', () => {
    const nova = { id: 'quest_inventada', description: '10 esquivas' };
    expect(questDescription(nova, 'kids')).toBe('10 esquivas');
  });

  it('a skin muda só a narrativa: alvo e métrica continuam no texto técnico', () => {
    // precisão > tema: o número do objetivo aparece nas duas versões
    const punches = QUEST_POOL.find((q) => q.id === 'punches_100')!;
    expect(questDescription(punches, 'adult')).toContain('100');
    expect(questDescription(punches, 'kids')).toContain('100');
  });
});

describe('copy por tema — ranks (motor → UI)', () => {
  it('Cinturões no adulto, Coroas no kids (SPECS §1)', () => {
    expect(rankLabel(1, 'adult')).toBe('Cinturão Bronze');
    expect(rankLabel(1, 'kids')).toBe('Coroa de Bronze');
    expect(rankLabel(35, 'adult')).toBe('Campeão');
    expect(rankLabel(35, 'kids')).toBe('Rainha do Ringue');
  });

  it('todo rank tem nome nos dois temas', () => {
    for (const theme of ['adult', 'kids'] as const) {
      for (const label of Object.values(RANK_LABELS[theme])) {
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('copy por tema — badges e UI', () => {
  it('badge com metáfora RPG troca o nome no kids; contagens neutras não', () => {
    const ironGuard = BADGES.find((b) => b.id === 'iron_guard')!;
    expect(badgeName(ironGuard, 'adult')).toBe('Guarda de Ferro');
    expect(badgeName(ironGuard, 'kids')).toBe('Escudo do Castelo');

    const punches100 = BADGES.find((b) => b.id === 'punches_100')!;
    expect(badgeName(punches100, 'kids')).toBe(punches100.name);
  });

  it('todo override de badge kids aponta p/ um id real do catálogo', () => {
    const ids = new Set(BADGES.map((b) => b.id));
    for (const id of Object.keys(KIDS_BADGE_NAMES)) {
      expect(ids.has(id as (typeof BADGES)[number]['id']), `id órfão: ${id}`).toBe(true);
    }
  });

  it('saudação da Home e textos de UI resolvem por tema', () => {
    expect(homeGreeting('Orlando', 'adult')).toContain('Orlando');
    expect(homeGreeting('Alice', 'kids')).toContain('Alice');
    expect(homeGreeting('Alice', 'kids')).not.toBe(homeGreeting('Alice', 'adult'));
    expect(uiCopy('questsAllDone', 'adult')).not.toBe(uiCopy('questsAllDone', 'kids'));
  });
});
