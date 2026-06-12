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
    throw new Error('storage indisponível');
  }
  setItem(): void {
    throw new Error('quota cheia');
  }
  removeItem(): void {
    throw new Error('storage indisponível');
  }
}

function newStore() {
  return new LocalStorageHistoryStore(new MemoryStorage());
}

describe('LocalStorageHistoryStore', () => {
  it('roundtrip: salva e recarrega um histórico real sem perdas', () => {
    const store = newStore();
    const { history } = applySession(emptyHistory(), summary(), {
      now: new Date(2026, 5, 11, 10, 0).getTime(),
      coachFeedback: 'Ótimo ritmo.',
    });
    store.save(history);
    expect(store.load()).toEqual(history);
  });

  it('sem documento salvo retorna histórico vazio do perfil', () => {
    const loaded = newStore().load();
    expect(loaded).toEqual(emptyHistory(DEFAULT_PROFILE_ID));
    expect(loaded.schemaVersion).toBe(HISTORY_SCHEMA_VERSION);
  });

  it('particiona por profileId (F7 não exigirá migração)', () => {
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

  it('JSON corrompido cai em histórico vazio (treino nunca quebra)', () => {
    const storage = new MemoryStorage();
    storage.setItem(historyStorageKey(DEFAULT_PROFILE_ID), '{nope');
    const store = new LocalStorageHistoryStore(storage);
    expect(store.load()).toEqual(emptyHistory(DEFAULT_PROFILE_ID));
  });

  it('storage lançando erros não propaga (load/save/clear são best-effort)', () => {
    const store = new LocalStorageHistoryStore(new BrokenStorage());
    expect(() => store.save(emptyHistory())).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.load()).toEqual(emptyHistory(DEFAULT_PROFILE_ID));
  });

  it('clear remove apenas o perfil indicado', () => {
    const store = newStore();
    store.save({ ...emptyHistory('default'), totalXp: 100 });
    store.save({ ...emptyHistory('kid-1'), totalXp: 50 });
    store.clear('default');
    expect(store.load('default').totalXp).toBe(0);
    expect(store.load('kid-1').totalXp).toBe(50);
  });
});

describe('migrateHistory (schema versionado)', () => {
  it('documento sem schemaVersion → vazio', () => {
    expect(migrateHistory({ totalXp: 500 }, 'default')).toEqual(emptyHistory('default'));
  });

  it('versão futura desconhecida → vazio (não tenta adivinhar)', () => {
    const doc = { ...emptyHistory('default'), schemaVersion: HISTORY_SCHEMA_VERSION + 1 };
    expect(migrateHistory(doc, 'default')).toEqual(emptyHistory('default'));
  });

  it('documento v1 parcial ganha defaults nos campos ausentes', () => {
    const migrated = migrateHistory({ schemaVersion: 1, totalXp: 320 }, 'default');
    expect(migrated.totalXp).toBe(320);
    expect(migrated.sessions).toEqual([]);
    expect(migrated.streak).toEqual({ count: 0, lastDate: null });
    expect(migrated.lifetime).toEqual({ sessions: 0, rounds: 0, punches: 0, goodPunches: 0 });
  });

  it('valores inválidos são saneados (totalXp negativo → 0)', () => {
    expect(migrateHistory({ schemaVersion: 1, totalXp: -10 }, 'default').totalXp).toBe(0);
    expect(migrateHistory(null, 'default')).toEqual(emptyHistory('default'));
    expect(migrateHistory([1, 2], 'default')).toEqual(emptyHistory('default'));
  });
});
