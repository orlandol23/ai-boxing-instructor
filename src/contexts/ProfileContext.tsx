/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  activeProfileOf,
  createProfile as createProfilePure,
  createProfileStore,
  deleteProfile as deleteProfilePure,
  selectProfile as selectProfilePure,
  updateProfile as updateProfilePure,
  type Profile,
  type ProfileDraft,
  type ProfileStore,
  type ProfilesDocument,
  type ProfileUpdate,
} from '../services/profileStore';
import { DEFAULT_THEME, setTheme, type Theme } from '../theme/theme';

/**
 * Ponte React ↔ ProfileStore (F7). Único dono do documento de perfis em
 * runtime: toda mutação passa por aqui (funções puras do store + save) e
 * o tema do app (`data-theme` no <html>) segue o perfil ativo —
 * `kids` (Arcade Royale) quando `isKid`, senão `adult` (Fight Night).
 */

export interface ProfileContextValue {
  profiles: Profile[];
  /** Perfil ativo (null = primeiro uso → seletor /profiles). */
  activeProfile: Profile | null;
  /** Tema derivado do perfil ativo ('adult' sem perfil). */
  theme: Theme;
  createProfile(draft: ProfileDraft): Profile;
  updateProfile(id: string, patch: ProfileUpdate): void;
  deleteProfile(id: string): void;
  selectProfile(id: string): void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function themeForProfile(profile: Profile | null): Theme {
  return profile?.isKid ? 'kids' : DEFAULT_THEME;
}

interface ProfileProviderProps {
  children: ReactNode;
  /** Injeção p/ testes; default = localStorage do browser. */
  store?: ProfileStore;
}

export function ProfileProvider({ children, store: storeProp }: ProfileProviderProps) {
  const store = useMemo(() => storeProp ?? createProfileStore(), [storeProp]);
  const [doc, setDoc] = useState<ProfilesDocument>(() => store.load());

  const activeProfile = activeProfileOf(doc);
  const theme = themeForProfile(activeProfile);

  // Tema segue o perfil ativo (inclusive ao alternar o modo kids do
  // perfil já ativo). O boot sem flash é garantido pelo script inline
  // no index.html; aqui é a fonte da verdade em runtime.
  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const commit = useCallback(
    (next: ProfilesDocument) => {
      store.save(next);
      setDoc(next);
    },
    [store]
  );

  const createProfile = useCallback(
    (draft: ProfileDraft): Profile => {
      const { doc: next, profile } = createProfilePure(store.load(), draft);
      commit(next);
      return profile;
    },
    [store, commit]
  );

  const updateProfile = useCallback(
    (id: string, patch: ProfileUpdate) => {
      commit(updateProfilePure(store.load(), id, patch));
    },
    [store, commit]
  );

  const deleteProfile = useCallback(
    (id: string) => {
      // Só remove do documento de perfis — o histórico do perfil no
      // HistoryStore fica intacto (escondido), por decisão do F7.
      commit(deleteProfilePure(store.load(), id));
    },
    [store, commit]
  );

  const selectProfile = useCallback(
    (id: string) => {
      commit(selectProfilePure(store.load(), id));
    },
    [store, commit]
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles: doc.profiles,
      activeProfile,
      theme,
      createProfile,
      updateProfile,
      deleteProfile,
      selectProfile,
    }),
    [doc.profiles, activeProfile, theme, createProfile, updateProfile, deleteProfile, selectProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfiles requer <ProfileProvider> acima na árvore');
  return ctx;
}

/**
 * Tema atual de forma tolerante: componentes de apresentação (cards,
 * badges) funcionam fora do provider (ex.: testes isolados) caindo no
 * tema adulto.
 */
export function useAppTheme(): Theme {
  return useContext(ProfileContext)?.theme ?? DEFAULT_THEME;
}
