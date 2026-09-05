import { describe, expect, it } from 'vitest';
import { QUEST_POOL, QUESTS_PER_DAY, dailyQuests, questStatuses } from '../quests';
import { daily, quality, qualityByType } from './fixtures';

function poolQuest(id: string) {
  const quest = QUEST_POOL.find((q) => q.id === id);
  if (!quest) throw new Error(`quest ${id} is not in the pool`);
  return quest;
}

describe('catalogue', () => {
  it('exposes i18n keys derived from the id, never literal copy', () => {
    for (const quest of QUEST_POOL) {
      expect(quest.descriptionKey).toBe(`quests.${quest.id}.description`);
    }
  });
});

describe('dailyQuests (deterministic draw)', () => {
  it('the same date always produces the same 3 quests', () => {
    const a = dailyQuests('2026-06-11').map((q) => q.id);
    const b = dailyQuests('2026-06-11').map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(QUESTS_PER_DAY);
  });

  it('never repeats a quest on the same day', () => {
    for (let day = 1; day <= 28; day++) {
      const key = `2026-06-${String(day).padStart(2, '0')}`;
      const ids = dailyQuests(key).map((q) => q.id);
      expect(new Set(ids).size).toBe(QUESTS_PER_DAY);
    }
  });

  it('different days vary the quests (it covers more than one fixed trio)', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 28; day++) {
      const key = `2026-07-${String(day).padStart(2, '0')}`;
      for (const q of dailyQuests(key)) seen.add(q.id);
    }
    expect(seen.size).toBeGreaterThan(QUESTS_PER_DAY);
  });
});

describe('quest progress against the day aggregate', () => {
  it('"30 good jabs" counts only jabs of good quality', () => {
    const day = daily({
      punchQualityByType: qualityByType({ jab: quality(12, 5, 3), cross: quality(40) }),
    });
    expect(poolQuest('jabs_good_30').progress(day)).toBe(12);
  });

  it('hooks count both hands, at any quality', () => {
    const day = daily({
      punchQualityByType: qualityByType({
        lead_hook: quality(4, 3, 1),
        rear_hook: quality(2, 0, 2),
      }),
    });
    expect(poolQuest('hooks_20').progress(day)).toBe(12);
  });

  it('round quests use the day\'s best round on the exact boundary (>= 80)', () => {
    expect(poolQuest('guard_80_round').progress(daily({ bestRoundGuard: 80 }))).toBe(1);
    expect(poolQuest('guard_80_round').progress(daily({ bestRoundGuard: 79.9 }))).toBe(0);
    expect(poolQuest('base_80_round').progress(daily({ bestRoundBase: 80 }))).toBe(1);
  });

  it('the day\'s volume accumulates sessions (totalPunches/goodPunches/rounds)', () => {
    const day = daily({ totalPunches: 120, goodPunches: 55, rounds: 4 });
    expect(poolQuest('punches_100').progress(day)).toBe(120);
    expect(poolQuest('good_punches_50').progress(day)).toBe(55);
    expect(poolQuest('rounds_3').progress(day)).toBe(4);
  });
});

describe('questStatuses', () => {
  it('a day with no training: progress 0 and nothing completed', () => {
    const statuses = questStatuses('2026-06-11', undefined, []);
    expect(statuses).toHaveLength(3);
    for (const s of statuses) {
      expect(s.progress).toBe(0);
      expect(s.done).toBe(false);
    }
  });

  it('caps the displayed progress at the quest target', () => {
    const day = daily({ totalPunches: 10_000, goodPunches: 10_000, rounds: 50 });
    for (const s of questStatuses('2026-06-11', day, [])) {
      expect(s.progress).toBeLessThanOrEqual(s.quest.target);
    }
  });

  it('a recorded completion is permanent for the day, even with the metric back at zero', () => {
    const [first] = questStatuses('2026-06-11', undefined, []);
    const statuses = questStatuses('2026-06-11', undefined, [first.quest.id]);
    const target = statuses.find((s) => s.quest.id === first.quest.id);
    expect(target?.done).toBe(true);
    expect(target?.progress).toBe(target?.quest.target);
  });
});
