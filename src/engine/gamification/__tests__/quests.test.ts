import { describe, expect, it } from 'vitest';
import { QUEST_POOL, QUESTS_PER_DAY, dailyQuests, questStatuses } from '../quests';
import { daily, quality, qualityByType } from './fixtures';

function poolQuest(id: string) {
  const quest = QUEST_POOL.find((q) => q.id === id);
  if (!quest) throw new Error(`missão ${id} não está no pool`);
  return quest;
}

describe('dailyQuests (sorteio determinístico)', () => {
  it('a mesma data gera sempre as mesmas 3 missões', () => {
    const a = dailyQuests('2026-06-11').map((q) => q.id);
    const b = dailyQuests('2026-06-11').map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(QUESTS_PER_DAY);
  });

  it('nunca repete missão no mesmo dia', () => {
    for (let day = 1; day <= 28; day++) {
      const key = `2026-06-${String(day).padStart(2, '0')}`;
      const ids = dailyQuests(key).map((q) => q.id);
      expect(new Set(ids).size).toBe(QUESTS_PER_DAY);
    }
  });

  it('dias diferentes variam as missões (cobre mais que um trio fixo)', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 28; day++) {
      const key = `2026-07-${String(day).padStart(2, '0')}`;
      for (const q of dailyQuests(key)) seen.add(q.id);
    }
    expect(seen.size).toBeGreaterThan(QUESTS_PER_DAY);
  });
});

describe('progresso das missões contra o agregado do dia', () => {
  it('"30 jabs bons" conta apenas jabs de qualidade good', () => {
    const day = daily({
      punchQualityByType: qualityByType({ jab: quality(12, 5, 3), cross: quality(40) }),
    });
    expect(poolQuest('jabs_good_30').progress(day)).toBe(12);
  });

  it('hooks contam as duas mãos, qualquer qualidade', () => {
    const day = daily({
      punchQualityByType: qualityByType({
        lead_hook: quality(4, 3, 1),
        rear_hook: quality(2, 0, 2),
      }),
    });
    expect(poolQuest('hooks_20').progress(day)).toBe(12);
  });

  it('missões de round usam o melhor round do dia na fronteira exata (≥ 80)', () => {
    expect(poolQuest('guard_80_round').progress(daily({ bestRoundGuard: 80 }))).toBe(1);
    expect(poolQuest('guard_80_round').progress(daily({ bestRoundGuard: 79.9 }))).toBe(0);
    expect(poolQuest('base_80_round').progress(daily({ bestRoundBase: 80 }))).toBe(1);
  });

  it('volume do dia acumula sessões (totalPunches/goodPunches/rounds)', () => {
    const day = daily({ totalPunches: 120, goodPunches: 55, rounds: 4 });
    expect(poolQuest('punches_100').progress(day)).toBe(120);
    expect(poolQuest('good_punches_50').progress(day)).toBe(55);
    expect(poolQuest('rounds_3').progress(day)).toBe(4);
  });
});

describe('questStatuses', () => {
  it('dia sem treino: progresso 0 e nada concluído', () => {
    const statuses = questStatuses('2026-06-11', undefined, []);
    expect(statuses).toHaveLength(3);
    for (const s of statuses) {
      expect(s.progress).toBe(0);
      expect(s.done).toBe(false);
    }
  });

  it('limita o progresso exibido ao alvo da missão', () => {
    const day = daily({ totalPunches: 10_000, goodPunches: 10_000, rounds: 50 });
    for (const s of questStatuses('2026-06-11', day, [])) {
      expect(s.progress).toBeLessThanOrEqual(s.quest.target);
    }
  });

  it('conclusão registrada é permanente no dia, mesmo com métrica zerada', () => {
    const [first] = questStatuses('2026-06-11', undefined, []);
    const statuses = questStatuses('2026-06-11', undefined, [first.quest.id]);
    const target = statuses.find((s) => s.quest.id === first.quest.id);
    expect(target?.done).toBe(true);
    expect(target?.progress).toBe(target?.quest.target);
  });
});
