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
    throw new Error('storage indisponível');
  }
  setItem(): void {
    throw new Error('quota cheia');
  }
  removeItem(): void {
    throw new Error('storage indisponível');
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
  it('primeiro perfil adota o id default p/ herdar o histórico pré-F7', () => {
    const { doc, profile } = createProfile(emptyProfilesDocument(), { name: 'Orlando' }, NOW);
    expect(profile.id).toBe(DEFAULT_PROFILE_ID);
    expect(doc.activeProfileId).toBe(DEFAULT_PROFILE_ID);
    expect(profile.avatar).toBe(DEFAULT_AVATAR);
    expect(profile.isKid).toBe(false);
    expect(profile.createdAt).toBe(NOW);
  });

  it('demais perfis ganham id único e viram o perfil ativo', () => {
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

  it('valida nome (obrigatório, trim, limite) e avatar fora do set curado', () => {
    expect(() => createProfile(emptyProfilesDocument(), { name: '   ' }, NOW)).toThrow();
    const long = 'x'.repeat(MAX_PROFILE_NAME_LENGTH + 10);
    const { profile } = createProfile(
      emptyProfilesDocument(),
      { name: `  ${long}  `, avatar: 'texto-livre' },
      NOW
    );
    expect(profile.name).toHaveLength(MAX_PROFILE_NAME_LENGTH);
    expect(profile.avatar).toBe(DEFAULT_AVATAR);
    expect(AVATARS).toContain(profile.avatar);
  });

  it('respeita o limite de perfis', () => {
    const doc = docWith(...Array.from({ length: MAX_PROFILES }, (_, i) => `P${i}`));
    expect(doc.profiles).toHaveLength(MAX_PROFILES);
    expect(() => createProfile(doc, { name: 'Extra' }, NOW)).toThrow();
  });
});

describe('updateProfile / selectProfile / deleteProfile', () => {
  it('renomeia, troca avatar e alterna o modo kids', () => {
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

  it('patch inválido não corrompe o perfil (nome vazio/avatar fora do set)', () => {
    const doc = docWith('Orlando');
    const updated = updateProfile(doc, DEFAULT_PROFILE_ID, { name: '  ', avatar: 'nope' });
    expect(updated.profiles[0].name).toBe('Orlando');
    expect(updated.profiles[0].avatar).toBe(DEFAULT_AVATAR);
  });

  it('id desconhecido é no-op em update/select', () => {
    const doc = docWith('Orlando');
    expect(updateProfile(doc, 'ghost', { name: 'X' })).toBe(doc);
    expect(selectProfile(doc, 'ghost')).toBe(doc);
  });

  it('selectProfile troca o perfil ativo', () => {
    const doc = docWith('Orlando', 'Alice');
    const alice = doc.profiles[1];
    expect(doc.activeProfileId).toBe(alice.id); // criação ativa o novo
    const back = selectProfile(doc, DEFAULT_PROFILE_ID);
    expect(activeProfileOf(back)?.name).toBe('Orlando');
  });

  it('deletar o perfil ativo volta o app ao seletor (ativo = null)', () => {
    const doc = docWith('Orlando', 'Alice');
    const aliceId = doc.profiles[1].id;
    const after = deleteProfile(doc, aliceId);
    expect(after.profiles.map((p) => p.name)).toEqual(['Orlando']);
    expect(after.activeProfileId).toBeNull();
    expect(activeProfileOf(after)).toBeNull();
  });

  it('deletar perfil NÃO apaga o histórico dele no HistoryStore (só esconde)', () => {
    const storage = new MemoryStorage();
    const profileStore = new LocalStorageProfileStore(storage);
    const historyStore = new LocalStorageHistoryStore(storage);

    let doc = docWith('Orlando', 'Alice');
    const aliceId = doc.profiles[1].id;
    historyStore.save({ ...emptyHistory(aliceId), totalXp: 1234 });

    doc = deleteProfile(doc, aliceId);
    profileStore.save(doc);

    // O documento de perfis não lista mais a Alice…
    expect(profileStore.load().profiles.map((p) => p.name)).toEqual(['Orlando']);
    // …mas a partição de histórico dela continua intacta no storage.
    expect(storage.getItem(historyStorageKey(aliceId))).not.toBeNull();
    expect(historyStore.load(aliceId).totalXp).toBe(1234);
  });
});

describe('LocalStorageProfileStore', () => {
  it('roundtrip: salva e recarrega o documento sem perdas', () => {
    const store = new LocalStorageProfileStore(new MemoryStorage());
    const doc = docWith('Orlando', 'Alice');
    store.save(doc);
    expect(store.load()).toEqual(doc);
  });

  it('sem documento salvo retorna documento vazio na versão atual', () => {
    const loaded = new LocalStorageProfileStore(new MemoryStorage()).load();
    expect(loaded).toEqual(emptyProfilesDocument());
    expect(loaded.schemaVersion).toBe(PROFILES_SCHEMA_VERSION);
  });

  it('JSON corrompido cai em documento vazio (primeiro uso)', () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILES_STORAGE_KEY, '{nope');
    expect(new LocalStorageProfileStore(storage).load()).toEqual(emptyProfilesDocument());
  });

  it('storage lançando erros não propaga (best-effort)', () => {
    const store = new LocalStorageProfileStore(new BrokenStorage());
    expect(() => store.save(docWith('Orlando'))).not.toThrow();
    expect(store.load()).toEqual(emptyProfilesDocument());
  });
});

describe('migrateProfiles (schema versionado)', () => {
  it('documento sem schemaVersion ou de versão futura → vazio', () => {
    expect(migrateProfiles({ profiles: [] })).toEqual(emptyProfilesDocument());
    expect(
      migrateProfiles({ ...docWith('Orlando'), schemaVersion: PROFILES_SCHEMA_VERSION + 1 })
    ).toEqual(emptyProfilesDocument());
    expect(migrateProfiles(null)).toEqual(emptyProfilesDocument());
  });

  it('perfis inválidos são filtrados e campos ausentes ganham defaults', () => {
    const migrated = migrateProfiles({
      schemaVersion: 1,
      profiles: [
        { id: 'default', name: 'Orlando' }, // sem avatar/isKid/createdAt
        { id: '', name: 'sem id' },
        { name: 'sem id também' },
        'lixo',
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

  it('activeProfileId apontando p/ perfil inexistente vira null', () => {
    const migrated = migrateProfiles({
      schemaVersion: 1,
      profiles: [{ id: 'default', name: 'Orlando', avatar: '🥊', isKid: false, createdAt: 1 }],
      activeProfileId: 'deletado',
    });
    expect(migrated.activeProfileId).toBeNull();
  });
});
