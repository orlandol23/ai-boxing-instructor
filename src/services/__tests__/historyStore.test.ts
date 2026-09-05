import { describe, expect, it } from 'vitest';
import {
  LocalStorageHistoryStore,
  historyStorageKey,
  migrateHistory,
  type StorageLike,
} from '../historyStore';
import {
  DEFAULT_PROFILE_ID,
  HISTORY_SCHEMA_VERSION,
  emptyHistory,
} from '../../engine/gamification/types';
import { applySession } from '../../engine/gamification/applySession';
import { summary } from '../../engine/gamification/__tests__/fixtures';

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

class BrokenStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('storage unavailable');
  }
  setItem(): void {
    throw new Error('quota full');
  }
  removeItem(): void {
    throw new Error('storage unavailable');
  }
}

function newStore() {
  return new LocalStorageHistoryStore(new MemoryStorage());
}

describe('LocalStorageHistoryStore', () => {
  it('roundtrip: saves and reloads a real history with no losses', () => {
    const store = newStore();
    const { history } = applySession(emptyHistory(), summary(), {
      now: new Date(2026, 5, 11, 10, 0).getTime(),
      coachFeedback: 'Great rhythm.',
    });
    store.save(history);
    expect(store.load()).toEqual(history);
  });

  it('returns the profile\'s empty history when no document is saved', () => {
    const loaded = newStore().load();
    expect(loaded).toEqual(emptyHistory(DEFAULT_PROFILE_ID));
    expect(loaded.schemaVersion).toBe(HISTORY_SCHEMA_VERSION);
  });

  it('partitions by profileId (F7 will not need a migration)', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageHistoryStore(storage);
    const adult = { ...emptyHistory('default'), totalXp: 100 };
    const kid = { ...emptyHistory('kid-1'), totalXp: 999 };
    store.save(adult);
    store.save(kid);

    expect(store.load('default').totalXp).toBe(100);
    expect(store.load('kid-1').totalXp).toBe(999);
    expect(historyStorageKey('kid-1')).not.toBe(historyStorageKey('default'));
  });

  it('corrupted JSON falls back to an empty history (training never breaks)', () => {
    const storage = new MemoryStorage();
    storage.setItem(historyStorageKey(DEFAULT_PROFILE_ID), '{nope');
    const store = new LocalStorageHistoryStore(storage);
    expect(store.load()).toEqual(emptyHistory(DEFAULT_PROFILE_ID));
  });

  it('a throwing storage does not propagate (load/save/clear are best-effort)', () => {
    const store = new LocalStorageHistoryStore(new BrokenStorage());
    expect(() => store.save(emptyHistory())).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.load()).toEqual(emptyHistory(DEFAULT_PROFILE_ID));
  });

  it('clear removes only the given profile', () => {
    const store = newStore();
    store.save({ ...emptyHistory('default'), totalXp: 100 });
    store.save({ ...emptyHistory('kid-1'), totalXp: 50 });
    store.clear('default');
    expect(store.load('default').totalXp).toBe(0);
    expect(store.load('kid-1').totalXp).toBe(50);
  });
});

describe('migrateHistory (versioned schema)', () => {
  it('a document with no schemaVersion becomes empty', () => {
    expect(migrateHistory({ totalXp: 500 }, 'default')).toEqual(emptyHistory('default'));
  });

  it('an unknown future version becomes empty (it never guesses)', () => {
    const doc = { ...emptyHistory('default'), schemaVersion: HISTORY_SCHEMA_VERSION + 1 };
    expect(migrateHistory(doc, 'default')).toEqual(emptyHistory('default'));
  });

  it('a partial v1 document gets defaults for the missing fields', () => {
    const migrated = migrateHistory({ schemaVersion: 1, totalXp: 320 }, 'default');
    expect(migrated.totalXp).toBe(320);
    expect(migrated.sessions).toEqual([]);
    expect(migrated.streak).toEqual({ count: 0, lastDate: null });
    expect(migrated.lifetime).toEqual({ sessions: 0, rounds: 0, punches: 0, goodPunches: 0 });
  });

  it('invalid values are sanitised (negative totalXp becomes 0)', () => {
    expect(migrateHistory({ schemaVersion: 1, totalXp: -10 }, 'default').totalXp).toBe(0);
    expect(migrateHistory(null, 'default')).toEqual(emptyHistory('default'));
    expect(migrateHistory([1, 2], 'default')).toEqual(emptyHistory('default'));
  });
});

/**
 * A corrupted document must not be able to crash the app.
 *
 * `Array.isArray` and `isRecord` only cleared the containers, so a malformed
 * element survived migration and threw on the first render of the home
 * screen, which is where the app starts: the user was locked out until
 * localStorage was cleared by hand. Each case below is a real crash that the
 * element-level validation now absorbs, and each asserts that the rest of the
 * document survives rather than being thrown away wholesale.
 */
describe('migrateHistory (corrupted elements)', () => {
  const doc = (over: Record<string, unknown>) => ({
    schemaVersion: HISTORY_SCHEMA_VERSION,
    totalXp: 500,
    ...over,
  });

  it('drops a null badge and keeps the valid ones', () => {
    const migrated = migrateHistory(
      doc({ unlockedBadges: [null, { id: 'first-session', unlockedAt: 1 }, 'nope'] }),
      'default'
    );

    expect(migrated.unlockedBadges).toEqual([{ id: 'first-session', unlockedAt: 1 }]);
    expect(migrated.totalXp).toBe(500);
  });

  it('drops a badge with no id', () => {
    const migrated = migrateHistory(doc({ unlockedBadges: [{ unlockedAt: 1 }] }), 'default');

    expect(migrated.unlockedBadges).toEqual([]);
  });

  it('drops a day whose completed quests are not a list', () => {
    const migrated = migrateHistory(
      doc({ completedQuests: { '2026-09-05': 7, '2026-09-04': ['quest-a', 3] } }),
      'default'
    );

    expect(migrated.completedQuests['2026-09-05']).toBeUndefined();
    expect(migrated.completedQuests['2026-09-04']).toEqual(['quest-a']);
  });

  it('drops a daily aggregate that is not an object', () => {
    const migrated = migrateHistory(doc({ dailyAggregates: { '2026-09-05': 5 } }), 'default');

    expect(migrated.dailyAggregates).toEqual({});
  });

  it('drops a daily aggregate missing the nested quality map', () => {
    const migrated = migrateHistory(
      doc({ dailyAggregates: { '2026-09-05': { sessions: 1, rounds: 2 } } }),
      'default'
    );

    expect(migrated.dailyAggregates).toEqual({});
  });

  it('drops a session with no id and keeps a well-formed one', () => {
    const wellFormed = {
      id: 's-1',
      profileId: 'default',
      startedAt: 1,
      endedAt: 2,
      dateKey: '2026-09-05',
      durationMs: 1000,
      rounds: 1,
      totalPunches: 10,
      punchBreakdown: {},
      punchQuality: {},
      punchQualityByType: {},
      avgGuardScore: 80,
      avgBaseScore: 70,
      roundDetails: [],
      xpGained: 100,
      coachFeedback: null,
    };
    const migrated = migrateHistory(doc({ sessions: [null, { rounds: 3 }, wellFormed] }), 'default');

    expect(migrated.sessions).toHaveLength(1);
    expect(migrated.sessions[0]?.id).toBe('s-1');
  });

  it('coerces a non-numeric count instead of carrying it through', () => {
    const migrated = migrateHistory(
      doc({ dailyAggregates: { '2026-09-05': { sessions: 'many', punchQualityByType: {} } } }),
      'default'
    );

    expect(migrated.dailyAggregates['2026-09-05']?.sessions).toBe(0);
  });
});
