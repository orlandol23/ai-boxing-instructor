import {
  DEFAULT_PROFILE_ID,
  HISTORY_SCHEMA_VERSION,
  emptyHistory,
  emptyLifetime,
  type ProfileHistory,
} from '../engine/gamification/types';

/**
 * History/progress persistence (F6), local-first.
 *
 * The HistoryStore interface isolates the UI from the storage medium: the
 * implementation today is localStorage (a JSON document versioned per
 * profile); the Neon sync (F6b) arrives as another implementation without
 * touching the UI. Storage is already partitioned by profileId so F7
 * (profiles) will not require a data migration.
 */
export interface HistoryStore {
  load(profileId?: string): ProfileHistory;
  save(history: ProfileHistory): void;
  clear(profileId?: string): void;
}

const KEY_PREFIX = 'boxing-ai:history';

export function historyStorageKey(profileId: string): string {
  return `${KEY_PREFIX}:${profileId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates/migrates a raw document into the current schema. An invalid,
 * corrupted or unknown future version becomes an empty history
 * (best-effort: training never breaks because of the history).
 */
export function migrateHistory(raw: unknown, profileId: string): ProfileHistory {
  if (!isRecord(raw) || typeof raw.schemaVersion !== 'number') {
    return emptyHistory(profileId);
  }
  if (raw.schemaVersion > HISTORY_SCHEMA_VERSION || raw.schemaVersion < 1) {
    return emptyHistory(profileId);
  }

  // v1 (current): accepts the document, filling missing fields with
  // defaults. Future versions add migration steps here.
  const base = emptyHistory(profileId);
  const streak = isRecord(raw.streak) ? raw.streak : {};
  const lifetime = isRecord(raw.lifetime) ? raw.lifetime : {};
  return {
    ...base,
    schemaVersion: HISTORY_SCHEMA_VERSION,
    totalXp: typeof raw.totalXp === 'number' && raw.totalXp >= 0 ? raw.totalXp : 0,
    lifetime: { ...emptyLifetime(), ...lifetime },
    streak: {
      count: typeof streak.count === 'number' ? streak.count : 0,
      lastDate: typeof streak.lastDate === 'string' ? streak.lastDate : null,
    },
    unlockedBadges: Array.isArray(raw.unlockedBadges) ? raw.unlockedBadges : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    dailyAggregates: isRecord(raw.dailyAggregates)
      ? (raw.dailyAggregates as ProfileHistory['dailyAggregates'])
      : {},
    completedQuests: isRecord(raw.completedQuests)
      ? (raw.completedQuests as ProfileHistory['completedQuests'])
      : {},
  };
}

/** The subset of Storage that is used, which makes test fakes (node) easy. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class LocalStorageHistoryStore implements HistoryStore {
  private readonly storage: StorageLike;

  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  load(profileId: string = DEFAULT_PROFILE_ID): ProfileHistory {
    try {
      const raw = this.storage.getItem(historyStorageKey(profileId));
      if (!raw) return emptyHistory(profileId);
      return migrateHistory(JSON.parse(raw), profileId);
    } catch {
      // Corrupted JSON or unavailable storage (private mode etc.).
      return emptyHistory(profileId);
    }
  }

  save(history: ProfileHistory): void {
    try {
      this.storage.setItem(historyStorageKey(history.profileId), JSON.stringify(history));
    } catch {
      // Quota full/unavailable: the history is best-effort, training goes on.
    }
  }

  clear(profileId: string = DEFAULT_PROFILE_ID): void {
    try {
      this.storage.removeItem(historyStorageKey(profileId));
    } catch {
      // Same here: a storage error never propagates to the UI.
    }
  }
}

/** The app's default store (browser). Created on demand so `localStorage`
 *  is never touched in DOM-less environments (engine tests run on node). */
export function createHistoryStore(): HistoryStore {
  return new LocalStorageHistoryStore(window.localStorage);
}
