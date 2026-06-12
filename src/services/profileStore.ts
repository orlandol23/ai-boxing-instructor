import { DEFAULT_PROFILE_ID } from '../engine/gamification/types';
import type { StorageLike } from './historyStore';

/**
 * Perfis múltiplos (F7) — local-first, mesmo padrão do HistoryStore:
 * documento JSON versionado em localStorage + funções puras de mutação.
 *
 * Importante: deletar um perfil NÃO apaga o histórico dele no
 * HistoryStore (chave `boxing-ai:history:<profileId>`) — o documento de
 * perfis só deixa de listar o id, então o histórico fica "escondido".
 * Decisão deliberada: exclusão acidental não destrói meses de treino, e
 * o F6b (sync Neon) ainda pode reconciliar esses dados.
 */

export interface Profile {
  id: string;
  name: string;
  /** Emoji do set curado AVATARS. */
  avatar: string;
  /** true → tema 'kids' (Arcade Royale) + copy RPG. */
  isKid: boolean;
  /** Epoch ms da criação. */
  createdAt: number;
}

export interface ProfilesDocument {
  schemaVersion: number;
  profiles: Profile[];
  /** Perfil ativo (null = primeiro uso → tela /profiles). */
  activeProfileId: string | null;
}

/** Dados do fluxo de criação (nome, avatar, modo kids). */
export interface ProfileDraft {
  name: string;
  avatar?: string;
  isKid?: boolean;
}

/** Campos editáveis de um perfil existente. */
export type ProfileUpdate = Partial<Pick<Profile, 'name' | 'avatar' | 'isKid'>>;

export const PROFILES_SCHEMA_VERSION = 1;
export const PROFILES_STORAGE_KEY = 'boxing-ai:profiles';
export const MAX_PROFILES = 8;
export const MAX_PROFILE_NAME_LENGTH = 20;

/** Set curado de avatares (emoji) — o seletor não aceita texto livre. */
export const AVATARS: readonly string[] = [
  '🥊',
  '🦁',
  '🐯',
  '🐉',
  '🦄',
  '🦅',
  '🐺',
  '🐼',
  '⭐',
  '🔥',
  '👑',
  '🤖',
];

export const DEFAULT_AVATAR = AVATARS[0];

export function emptyProfilesDocument(): ProfilesDocument {
  return {
    schemaVersion: PROFILES_SCHEMA_VERSION,
    profiles: [],
    activeProfileId: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeProfile(raw: unknown): Profile | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) return null;
  return {
    id: raw.id,
    name: raw.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH),
    avatar: typeof raw.avatar === 'string' && raw.avatar.length > 0 ? raw.avatar : DEFAULT_AVATAR,
    isKid: raw.isKid === true,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
  };
}

/**
 * Valida/migra um documento bruto para o schema atual. Documento
 * inválido, corrompido ou de versão futura → documento vazio (o app cai
 * no fluxo de primeiro uso; o histórico por perfil fica intacto).
 */
export function migrateProfiles(raw: unknown): ProfilesDocument {
  if (!isRecord(raw) || typeof raw.schemaVersion !== 'number') {
    return emptyProfilesDocument();
  }
  if (raw.schemaVersion > PROFILES_SCHEMA_VERSION || raw.schemaVersion < 1) {
    return emptyProfilesDocument();
  }

  const profiles = (Array.isArray(raw.profiles) ? raw.profiles : [])
    .map(sanitizeProfile)
    .filter((p): p is Profile => p !== null)
    .slice(0, MAX_PROFILES);

  const activeProfileId =
    typeof raw.activeProfileId === 'string' &&
    profiles.some((p) => p.id === raw.activeProfileId)
      ? raw.activeProfileId
      : null;

  return { schemaVersion: PROFILES_SCHEMA_VERSION, profiles, activeProfileId };
}

/* ---------------------------------------------------- mutações (puras) */

function newProfileId(now: number): string {
  return `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Cria um perfil e o torna ativo. O PRIMEIRO perfil do app adota
 * DEFAULT_PROFILE_ID ('default') para herdar o histórico/XP acumulado
 * antes do F7 (o HistoryStore do F6 gravava nesse id implícito).
 */
export function createProfile(
  doc: ProfilesDocument,
  draft: ProfileDraft,
  now: number = Date.now()
): { doc: ProfilesDocument; profile: Profile } {
  const name = draft.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH);
  if (name.length === 0) {
    throw new Error('Nome do perfil é obrigatório');
  }
  if (doc.profiles.length >= MAX_PROFILES) {
    throw new Error(`Máximo de ${MAX_PROFILES} perfis`);
  }

  const profile: Profile = {
    id: doc.profiles.length === 0 ? DEFAULT_PROFILE_ID : newProfileId(now),
    name,
    avatar: draft.avatar && AVATARS.includes(draft.avatar) ? draft.avatar : DEFAULT_AVATAR,
    isKid: draft.isKid === true,
    createdAt: now,
  };

  return {
    doc: {
      ...doc,
      profiles: [...doc.profiles, profile],
      activeProfileId: profile.id,
    },
    profile,
  };
}

/** Renomear / trocar avatar / alternar modo kids. Id desconhecido = no-op. */
export function updateProfile(
  doc: ProfilesDocument,
  id: string,
  patch: ProfileUpdate
): ProfilesDocument {
  const index = doc.profiles.findIndex((p) => p.id === id);
  if (index < 0) return doc;

  const current = doc.profiles[index];
  const name =
    patch.name !== undefined ? patch.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH) : current.name;
  const updated: Profile = {
    ...current,
    name: name.length > 0 ? name : current.name,
    avatar:
      patch.avatar !== undefined && AVATARS.includes(patch.avatar) ? patch.avatar : current.avatar,
    isKid: patch.isKid !== undefined ? patch.isKid : current.isKid,
  };

  const profiles = [...doc.profiles];
  profiles[index] = updated;
  return { ...doc, profiles };
}

/**
 * Remove o perfil da lista (se era o ativo, o app volta ao seletor).
 * O histórico no HistoryStore NÃO é apagado — apenas fica oculto (ver
 * nota no topo do arquivo).
 */
export function deleteProfile(doc: ProfilesDocument, id: string): ProfilesDocument {
  const profiles = doc.profiles.filter((p) => p.id !== id);
  if (profiles.length === doc.profiles.length) return doc;
  return {
    ...doc,
    profiles,
    activeProfileId: doc.activeProfileId === id ? null : doc.activeProfileId,
  };
}

/** Torna `id` o perfil ativo. Id desconhecido = no-op. */
export function selectProfile(doc: ProfilesDocument, id: string): ProfilesDocument {
  if (!doc.profiles.some((p) => p.id === id)) return doc;
  if (doc.activeProfileId === id) return doc;
  return { ...doc, activeProfileId: id };
}

/** Perfil ativo do documento (null = primeiro uso / perfil deletado). */
export function activeProfileOf(doc: ProfilesDocument): Profile | null {
  return doc.profiles.find((p) => p.id === doc.activeProfileId) ?? null;
}

/* ------------------------------------------------------- persistência */

export interface ProfileStore {
  load(): ProfilesDocument;
  save(doc: ProfilesDocument): void;
}

export class LocalStorageProfileStore implements ProfileStore {
  private readonly storage: StorageLike;

  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  load(): ProfilesDocument {
    try {
      const raw = this.storage.getItem(PROFILES_STORAGE_KEY);
      if (!raw) return emptyProfilesDocument();
      return migrateProfiles(JSON.parse(raw));
    } catch {
      // JSON corrompido ou storage indisponível (modo privado etc.).
      return emptyProfilesDocument();
    }
  }

  save(doc: ProfilesDocument): void {
    try {
      this.storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Quota cheia/indisponível: perfis são best-effort, treino segue.
    }
  }
}

/** Store padrão do app (browser). Criado sob demanda p/ não tocar em
 *  `localStorage` em ambientes sem DOM. */
export function createProfileStore(): ProfileStore {
  return new LocalStorageProfileStore(window.localStorage);
}
