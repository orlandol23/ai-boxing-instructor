import {
  DEFAULT_PROFILE_ID,
  HISTORY_SCHEMA_VERSION,
  emptyHistory,
  emptyLifetime,
  type DailyAggregate,
  type ProfileHistory,
  type SessionRecord,
  type UnlockedBadge,
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
 * Element-level validation for the four collections.
 *
 * `Array.isArray` and `isRecord` only clear the container. Everything that
 * reads this document afterwards walks into the elements: `progressSnapshot`
 * reads `badge.id`, the weekly chart reads aggregate fields, and the quest
 * check calls `.includes` on each day's value. A single malformed element
 * therefore threw on the first render of the home screen, which is where the
 * app starts, so the whole app was unreachable until localStorage was cleared
 * by hand. Dropping the bad element keeps the rest of the history.
 */
function sanitizeList<T>(raw: unknown, sanitize: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    const clean = sanitize(item);
    if (clean !== null) out.push(clean);
  }
  return out;
}

function sanitizeMap<T>(
  raw: unknown,
  sanitize: (value: unknown, key: string) => T | null
): Record<string, T> {
  if (!isRecord(raw)) return {};
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(raw)) {
    const clean = sanitize(value, key);
    if (clean !== null) out[key] = clean;
  }
  return out;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeBadge(raw: unknown): UnlockedBadge | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  return { id: raw.id, unlockedAt: num(raw.unlockedAt) };
}

/**
 * `punchQualityByType` is a nested map that both the chart and the aggregate
 * walk by key (`day.punchQualityByType[type][quality]`). There is no safe
 * default for it here that the engine does not already own, so an element
 * missing it is dropped rather than rebuilt: losing one corrupted day beats
 * handing the renderer a shape it will index into and crash on.
 */
function sanitizeSession(raw: unknown): SessionRecord | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (!isRecord(raw.punchBreakdown)) return null;
  if (!isRecord(raw.punchQuality)) return null;
  if (!isRecord(raw.punchQualityByType)) return null;
  return {
    id: raw.id,
    profileId: typeof raw.profileId === 'string' ? raw.profileId : DEFAULT_PROFILE_ID,
    startedAt: num(raw.startedAt),
    endedAt: num(raw.endedAt),
    dateKey: typeof raw.dateKey === 'string' ? raw.dateKey : '',
    durationMs: num(raw.durationMs),
    rounds: num(raw.rounds),
    totalPunches: num(raw.totalPunches),
    punchBreakdown: raw.punchBreakdown,
    punchQuality: raw.punchQuality,
    punchQualityByType: raw.punchQualityByType,
    avgGuardScore: num(raw.avgGuardScore),
    avgBaseScore: num(raw.avgBaseScore),
    roundDetails: Array.isArray(raw.roundDetails) ? raw.roundDetails : [],
    xpGained: num(raw.xpGained),
    coachFeedback: typeof raw.coachFeedback === 'string' ? raw.coachFeedback : null,
  } as SessionRecord;
}

function sanitizeAggregate(raw: unknown, key: string): DailyAggregate | null {
  if (!isRecord(raw)) return null;
  if (!isRecord(raw.punchQualityByType)) return null;
  return {
    ...raw,
    dateKey: typeof raw.dateKey === 'string' ? raw.dateKey : key,
    sessions: num(raw.sessions),
    rounds: num(raw.rounds),
    totalPunches: num(raw.totalPunches),
    goodPunches: num(raw.goodPunches),
    scoreSum: num(raw.scoreSum),
    bestRoundGuard: num(raw.bestRoundGuard),
    bestRoundBase: num(raw.bestRoundBase),
    xpGained: num(raw.xpGained),
  } as DailyAggregate;
}

/** A day's completed quests. Anything that is not a list of ids is dropped. */
function sanitizeQuestIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((id): id is string => typeof id === 'string');
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
    unlockedBadges: sanitizeList(raw.unlockedBadges, sanitizeBadge),
    sessions: sanitizeList(raw.sessions, sanitizeSession),
    dailyAggregates: sanitizeMap(raw.dailyAggregates, sanitizeAggregate),
    completedQuests: sanitizeMap(raw.completedQuests, sanitizeQuestIds),
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
