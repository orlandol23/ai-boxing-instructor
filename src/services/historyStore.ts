import {
  DEFAULT_PROFILE_ID,
  HISTORY_SCHEMA_VERSION,
  emptyHistory,
  emptyLifetime,
  type ProfileHistory,
} from '../engine/gamification/types';

/**
 * Persistência do histórico/progresso (F6) — local-first.
 *
 * A interface HistoryStore isola a UI do meio de armazenamento: hoje a
 * implementação é localStorage (documento JSON versionado por perfil);
 * o sync com Neon (F6b) entra como outra implementação sem tocar na UI.
 * O storage já é particionado por profileId p/ o F7 (perfis) não exigir
 * migração de dados.
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
 * Valida/migra um documento bruto para o schema atual. Documento
 * inválido, corrompido ou de versão futura desconhecida → histórico
 * vazio (best-effort: o treino nunca quebra por causa do histórico).
 */
export function migrateHistory(raw: unknown, profileId: string): ProfileHistory {
  if (!isRecord(raw) || typeof raw.schemaVersion !== 'number') {
    return emptyHistory(profileId);
  }
  if (raw.schemaVersion > HISTORY_SCHEMA_VERSION || raw.schemaVersion < 1) {
    return emptyHistory(profileId);
  }

  // v1 (atual): aceita o documento preenchendo campos ausentes com
  // defaults — versões futuras adicionam passos de migração aqui.
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

/** Subconjunto de Storage usado — facilita fakes em teste (node). */
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
      // JSON corrompido ou storage indisponível (modo privado etc.).
      return emptyHistory(profileId);
    }
  }

  save(history: ProfileHistory): void {
    try {
      this.storage.setItem(historyStorageKey(history.profileId), JSON.stringify(history));
    } catch {
      // Quota cheia/indisponível: histórico é best-effort, treino segue.
    }
  }

  clear(profileId: string = DEFAULT_PROFILE_ID): void {
    try {
      this.storage.removeItem(historyStorageKey(profileId));
    } catch {
      // idem: nunca propaga erro de storage para a UI.
    }
  }
}

/** Store padrão do app (browser). Criado sob demanda p/ não tocar em
 *  `localStorage` em ambientes sem DOM (testes do engine rodam em node). */
export function createHistoryStore(): HistoryStore {
  return new LocalStorageHistoryStore(window.localStorage);
}
