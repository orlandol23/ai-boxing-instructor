import { describe, expect, it } from 'vitest';
import {
  AVATARS,
  DEFAULT_AVATAR,
  LocalStorageProfileStore,
  MAX_PROFILES,
  MAX_PROFILE_NAME_LENGTH,
  PROFILES_SCHEMA_VERSION,
  PROFILES_STORAGE_KEY,
  activeProfileOf,
  createProfile,
  deleteProfile,
  emptyProfilesDocument,
  migrateProfiles,
  selectProfile,
  updateProfile,
  type ProfilesDocument,
} from '../profileStore';
import {
  LocalStorageHistoryStore,
  historyStorageKey,
  type StorageLike,
} from '../historyStore';
import { DEFAULT_PROFILE_ID, emptyHistory } from '../../engine/gamification/types';

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

const NOW = new Date(2026, 5, 12, 10, 0).getTime();

function docWith(...names: string[]): ProfilesDocument {
  let doc = emptyProfilesDocument();
  for (const name of names) {
    doc = createProfile(doc, { name }, NOW).doc;
  }
  return doc;
}

describe('createProfile', () => {
  it('the first profile takes the default id so it inherits the pre-F7 history', () => {
    const { doc, profile } = createProfile(emptyProfilesDocument(), { name: 'Orlando' }, NOW);
    expect(profile.id).toBe(DEFAULT_PROFILE_ID);
    expect(doc.activeProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(profile.avatar).toBe(DEFAULT_AVATAR);
    expect(profile.isKid).toBe(false);
    expect(profile.createdAt).toBe(NOW);
  });

  it('further profiles get a unique id and become the active profile', () => {
    const first = createProfile(emptyProfilesDocument(), { name: 'Orlando' }, NOW);
    const second = createProfile(
      first.doc,
      { name: 'Alice', avatar: '👑', isKid: true },
      NOW
    );
    expect(second.profile.id).not.toBe(DEFAULT_PROFILE_ID);
    expect(second.profile.isKid).toBe(true);
    expect(second.profile.avatar).toBe('👑');
    expect(second.doc.profiles).toHaveLength(2);
    expect(second.doc.activeProfileId).toBe(second.profile.id);
  });

  it('validates the name (required, trimmed, capped) and an avatar outside the curated set', () => {
    expect(() => createProfile(emptyProfilesDocument(), { name: '   ' }, NOW)).toThrow();
    const long = 'x'.repeat(MAX_PROFILE_NAME_LENGTH + 10);
    const { profile } = createProfile(
      emptyProfilesDocument(),
      { name: `  ${long}  `, avatar: 'free-text' },
      NOW
    );
    expect(profile.name).toHaveLength(MAX_PROFILE_NAME_LENGTH);
    expect(profile.avatar).toBe(DEFAULT_AVATAR);
    expect(AVATARS).toContain(profile.avatar);
  });

  it('respects the profile limit', () => {
    const doc = docWith(...Array.from({ length: MAX_PROFILES }, (_, i) => `P${i}`));
    expect(doc.profiles).toHaveLength(MAX_PROFILES);
    expect(() => createProfile(doc, { name: 'Extra' }, NOW)).toThrow();
  });
});

describe('updateProfile / selectProfile / deleteProfile', () => {
  it('renames, changes the avatar and toggles kids mode', () => {
    const doc = docWith('Orlando');
    const updated = updateProfile(doc, DEFAULT_PROFILE_ID, {
      name: ' Lando ',
      avatar: '🐉',
      isKid: true,
    });
    const profile = updated.profiles[0];
    expect(profile.name).toBe('Lando');
    expect(profile.avatar).toBe('🐉');
    expect(profile.isKid).toBe(true);
  });

  it('an invalid patch does not corrupt the profile (empty name/avatar outside the set)', () => {
    const doc = docWith('Orlando');
    const updated = updateProfile(doc, DEFAULT_PROFILE_ID, { name: '  ', avatar: 'nope' });
    expect(updated.profiles[0].name).toBe('Orlando');
    expect(updated.profiles[0].avatar).toBe(DEFAULT_AVATAR);
  });

  it('an unknown id is a no-op for update/select', () => {
    const doc = docWith('Orlando');
    expect(updateProfile(doc, 'ghost', { name: 'X' })).toBe(doc);
    expect(selectProfile(doc, 'ghost')).toBe(doc);
  });

  it('selectProfile switches the active profile', () => {
    const doc = docWith('Orlando', 'Alice');
    const alice = doc.profiles[1];
    expect(doc.activeProfileId).toBe(alice.id); // creating one activates it
    const back = selectProfile(doc, DEFAULT_PROFILE_ID);
    expect(activeProfileOf(back)?.name).toBe('Orlando');
  });

  it('deleting the active profile sends the app back to the selector (active = null)', () => {
    const doc = docWith('Orlando', 'Alice');
    const aliceId = doc.profiles[1].id;
    const after = deleteProfile(doc, aliceId);
    expect(after.profiles.map((p) => p.name)).toEqual(['Orlando']);
    expect(after.activeProfileId).toBeNull();
    expect(activeProfileOf(after)).toBeNull();
  });

  it('deleting a profile does NOT erase its history in the HistoryStore (it only hides it)', () => {
    const storage = new MemoryStorage();
    const profileStore = new LocalStorageProfileStore(storage);
    const historyStore = new LocalStorageHistoryStore(storage);

    let doc = docWith('Orlando', 'Alice');
    const aliceId = doc.profiles[1].id;
    historyStore.save({ ...emptyHistory(aliceId), totalXp: 1234 });

    doc = deleteProfile(doc, aliceId);
    profileStore.save(doc);

    // The profiles document no longer lists Alice…
    expect(profileStore.load().profiles.map((p) => p.name)).toEqual(['Orlando']);
    // …but her history partition is still intact in the storage.
    expect(storage.getItem(historyStorageKey(aliceId))).not.toBeNull();
    expect(historyStore.load(aliceId).totalXp).toBe(1234);
  });
});

describe('LocalStorageProfileStore', () => {
  it('roundtrip: saves and reloads the document with no losses', () => {
    const store = new LocalStorageProfileStore(new MemoryStorage());
    const doc = docWith('Orlando', 'Alice');
    store.save(doc);
    expect(store.load()).toEqual(doc);
  });

  it('returns an empty document at the current version when none is saved', () => {
    const loaded = new LocalStorageProfileStore(new MemoryStorage()).load();
    expect(loaded).toEqual(emptyProfilesDocument());
    expect(loaded.schemaVersion).toBe(PROFILES_SCHEMA_VERSION);
  });

  it('corrupted JSON falls back to an empty document (first use)', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILES_STORAGE_KEY, '{nope');
    expect(new LocalStorageProfileStore(storage).load()).toEqual(emptyProfilesDocument());
  });

  it('a throwing storage does not propagate (best-effort)', () => {
    const store = new LocalStorageProfileStore(new BrokenStorage());
    expect(() => store.save(docWith('Orlando'))).not.toThrow();
    expect(store.load()).toEqual(emptyProfilesDocument());
  });
});

describe('migrateProfiles (versioned schema)', () => {
  it('a document with no schemaVersion or from a future version becomes empty', () => {
    expect(migrateProfiles({ profiles: [] })).toEqual(emptyProfilesDocument());
    expect(
      migrateProfiles({ ...docWith('Orlando'), schemaVersion: PROFILES_SCHEMA_VERSION + 1 })
    ).toEqual(emptyProfilesDocument());
    expect(migrateProfiles(null)).toEqual(emptyProfilesDocument());
  });

  it('invalid profiles are filtered out and missing fields get defaults', () => {
    const migrated = migrateProfiles({
      schemaVersion: 1,
      profiles: [
        { id: 'default', name: 'Orlando' }, // no avatar/isKid/createdAt
        { id: '', name: 'no id' },
        { name: 'no id either' },
        'junk',
      ],
      activeProfileId: 'default',
    });
    expect(migrated.profiles).toHaveLength(1);
    expect(migrated.profiles[0]).toEqual({
      id: 'default',
      name: 'Orlando',
      avatar: DEFAULT_AVATAR,
      isKid: false,
      createdAt: 0,
    });
    expect(migrated.activeProfileId).toBe('default');
  });

  it('an activeProfileId pointing at a missing profile becomes null', () => {
    const migrated = migrateProfiles({
      schemaVersion: 1,
      profiles: [{ id: 'default', name: 'Orlando', avatar: '🥊', isKid: false, createdAt: 1 }],
      activeProfileId: 'deleted',
    });
    expect(migrated.activeProfileId).toBeNull();
  });
});
