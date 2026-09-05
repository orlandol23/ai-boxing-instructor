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
 * React ↔ ProfileStore bridge (F7). The single owner of the profiles
 * document at runtime: every mutation goes through here (the store's pure
 * functions + save) and the app theme (`data-theme` on <html>) follows the
 * active profile: `kids` (Arcade Royale) when `isKid`, otherwise `adult`
 * (Fight Night).
 */

export interface ProfileContextValue {
  profiles: Profile[];
  /** Active profile (null = first use, which lands on the /profiles selector). */
  activeProfile: Profile | null;
  /** Theme derived from the active profile ('adult' when there is none). */
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
  /** Injection point for tests; defaults to the browser's localStorage. */
  store?: ProfileStore;
}

export function ProfileProvider({ children, store: storeProp }: ProfileProviderProps) {
  const store = useMemo(() => storeProp ?? createProfileStore(), [storeProp]);
  const [doc, setDoc] = useState<ProfilesDocument>(() => store.load());

  const activeProfile = activeProfileOf(doc);
  const theme = themeForProfile(activeProfile);

  // The theme follows the active profile (including when the kids mode of
  // the already active profile is toggled). The flash-free boot is handled
  // by the inline script in index.html; this is the runtime source of truth.
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
      // Only removed from the profiles document. The profile's history in
      // the HistoryStore stays intact (hidden), by the F7 decision.
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
  if (!ctx) throw new Error('useProfiles requires a <ProfileProvider> above it in the tree');
  return ctx;
}

/**
 * The current theme, read tolerantly: presentational components (cards,
 * badges) still work outside the provider (e.g. isolated tests) by falling
 * back to the adult theme.
 */
export function useAppTheme(): Theme {
  return useContext(ProfileContext)?.theme ?? DEFAULT_THEME;
}
