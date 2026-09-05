import { DEFAULT_PROFILE_ID } from '../engine/gamification/types';
import type { StorageLike } from './historyStore';

/**
 * Multiple profiles (F7), local-first, same pattern as the HistoryStore:
 * a versioned JSON document in localStorage + pure mutation functions.
 *
 * Important: deleting a profile does NOT erase its history in the
 * HistoryStore (key `boxing-ai:history:<profileId>`). The profiles
 * document simply stops listing the id, so the history is "hidden".
 * A deliberate decision: an accidental deletion does not destroy months
 * of training, and F6b (Neon sync) can still reconcile that data.
 */

export interface Profile {
  id: string;
  name: string;
  /** Emoji from the curated AVATARS set. */
  avatar: string;
  /** true means the 'kids' theme (Arcade Royale) + RPG copy. */
  isKid: boolean;
  /** Creation epoch, in ms. */
  createdAt: number;
}

export interface ProfilesDocument {
  schemaVersion: number;
  profiles: Profile[];
  /** Active profile (null = first use, which lands on the /profiles screen). */
  activeProfileId: string | null;
}

/** Data from the creation flow (name, avatar, kids mode). */
export interface ProfileDraft {
  name: string;
  avatar?: string;
  isKid?: boolean;
}

/** Editable fields of an existing profile. */
export type ProfileUpdate = Partial<Pick<Profile, 'name' | 'avatar' | 'isKid'>>;

export const PROFILES_SCHEMA_VERSION = 1;
export const PROFILES_STORAGE_KEY = 'boxing-ai:profiles';
export const MAX_PROFILES = 8;
export const MAX_PROFILE_NAME_LENGTH = 20;

/** Curated set of avatars (emoji). The picker takes no free text. */
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
 * Validates/migrates a raw document into the current schema. An invalid,
 * corrupted or future-version document becomes an empty document (the app
 * falls into the first-use flow; the per-profile history stays intact).
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

/* ------------------------------------------------------ mutations (pure) */

function newProfileId(now: number): string {
  return `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a profile and makes it active. The FIRST profile in the app
 * takes DEFAULT_PROFILE_ID ('default') so it inherits the history/XP
 * accumulated before F7 (the F6 HistoryStore wrote under that implicit id).
 */
export function createProfile(
  doc: ProfilesDocument,
  draft: ProfileDraft,
  now: number = Date.now()
): { doc: ProfilesDocument; profile: Profile } {
  const name = draft.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH);
  if (name.length === 0) {
    throw new Error('Profile name is required');
  }
  if (doc.profiles.length >= MAX_PROFILES) {
    throw new Error(`At most ${MAX_PROFILES} profiles`);
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

/** Rename / change avatar / toggle kids mode. An unknown id is a no-op. */
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
 * Removes the profile from the list (if it was the active one, the app
 * goes back to the selector). The history in the HistoryStore is NOT
 * erased, only hidden (see the note at the top of the file).
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

/** Makes `id` the active profile. An unknown id is a no-op. */
export function selectProfile(doc: ProfilesDocument, id: string): ProfilesDocument {
  if (!doc.profiles.some((p) => p.id === id)) return doc;
  if (doc.activeProfileId === id) return doc;
  return { ...doc, activeProfileId: id };
}

/** The document's active profile (null = first use / deleted profile). */
export function activeProfileOf(doc: ProfilesDocument): Profile | null {
  return doc.profiles.find((p) => p.id === doc.activeProfileId) ?? null;
}

/* ------------------------------------------------------- persistence */

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
      // Corrupted JSON or unavailable storage (private mode etc.).
      return emptyProfilesDocument();
    }
  }

  save(doc: ProfilesDocument): void {
    try {
      this.storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Quota full/unavailable: profiles are best-effort, training goes on.
    }
  }
}

/** The app's default store (browser). Created on demand so `localStorage`
 *  is never touched in DOM-less environments. */
export function createProfileStore(): ProfileStore {
  return new LocalStorageProfileStore(window.localStorage);
}
