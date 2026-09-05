// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ProfileProvider, useAppTheme, useProfiles } from '../ProfileContext';
import { useGamification } from '../../hooks/useGamification';
import {
  PROFILES_STORAGE_KEY,
  createProfile,
  emptyProfilesDocument,
} from '../../services/profileStore';
import { historyStorageKey } from '../../services/historyStore';
import { DEFAULT_PROFILE_ID } from '../../engine/gamification/types';
import { summary } from '../../engine/gamification/__tests__/fixtures';
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '../../i18n';
import { badgeName, questDescription } from '../../theme/copy';
import { BADGES } from '../../engine/gamification/badges';
import { QUEST_POOL } from '../../engine/gamification/quests';

/**
 * F7 integration: ProfileProvider + the theme on <html> + the
 * history/gamification partition per active profile (jsdom's real
 * localStorage).
 *
 * It also pins the separation of the two copy axes: the PROFILE picks the
 * theme (adult/kids), the LANGUAGE is picked by the user and persisted
 * separately, so switching profile never touches the language, and the
 * other way round.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}

function useHarness() {
  return { profiles: useProfiles(), gamification: useGamification(), theme: useAppTheme() };
}

beforeEach(async () => {
  window.localStorage.clear();
  document.documentElement.dataset.theme = 'adult';
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe('ProfileProvider: the theme follows the active profile', () => {
  it('first use: no active profile, adult theme', () => {
    const { result } = renderHook(useHarness, { wrapper });
    expect(result.current.profiles.activeProfile).toBeNull();
    expect(result.current.theme).toBe('adult');
    expect(document.documentElement.dataset.theme).toBe('adult');
  });

  it('creating/switching a profile applies the theme on <html> (kids ↔ adult)', () => {
    const { result } = renderHook(useHarness, { wrapper });

    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    expect(document.documentElement.dataset.theme).toBe('adult');

    let kidId = '';
    act(() => {
      kidId = result.current.profiles.createProfile({
        name: 'Alice',
        avatar: '👑',
        isKid: true,
      }).id;
    });
    expect(result.current.theme).toBe('kids');
    expect(document.documentElement.dataset.theme).toBe('kids');

    act(() => {
      result.current.profiles.selectProfile(DEFAULT_PROFILE_ID);
    });
    expect(document.documentElement.dataset.theme).toBe('adult');

    act(() => {
      result.current.profiles.selectProfile(kidId);
    });
    expect(document.documentElement.dataset.theme).toBe('kids');
  });

  it('toggling kids mode on the active profile re-themes immediately', () => {
    const { result } = renderHook(useHarness, { wrapper });
    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    act(() => {
      result.current.profiles.updateProfile(DEFAULT_PROFILE_ID, { isKid: true });
    });
    expect(document.documentElement.dataset.theme).toBe('kids');
  });

  it('boot: mounts already carrying the persisted last active profile theme', () => {
    const { doc } = createProfile(emptyProfilesDocument(), { name: 'Alice', isKid: true });
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(doc));

    const { result } = renderHook(useHarness, { wrapper });
    expect(result.current.profiles.activeProfile?.name).toBe('Alice');
    expect(document.documentElement.dataset.theme).toBe('kids');
  });
});

describe('ProfileProvider + useGamification: partition per profile', () => {
  it('switching profile switches the XP/history partition (and it comes back intact)', () => {
    const { result } = renderHook(useHarness, { wrapper });

    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    act(() => {
      result.current.gamification.recordSession(summary());
    });
    const adultXp = result.current.gamification.history.totalXp;
    expect(adultXp).toBeGreaterThan(0);

    // A new kids profile starts from zero, writing under another key…
    let kidId = '';
    act(() => {
      kidId = result.current.profiles.createProfile({ name: 'Alice', isKid: true }).id;
    });
    expect(result.current.gamification.history.profileId).toBe(kidId);
    expect(result.current.gamification.history.totalXp).toBe(0);

    act(() => {
      result.current.gamification.recordSession(summary());
    });
    expect(window.localStorage.getItem(historyStorageKey(kidId))).not.toBeNull();
    expect(window.localStorage.getItem(historyStorageKey(DEFAULT_PROFILE_ID))).not.toBeNull();

    // …and going back to the adult profile recovers its XP, with no mixing.
    act(() => {
      result.current.profiles.selectProfile(DEFAULT_PROFILE_ID);
    });
    expect(result.current.gamification.history.profileId).toBe(DEFAULT_PROFILE_ID);
    expect(result.current.gamification.history.totalXp).toBe(adultXp);
  });

  it('deleting a profile hides but preserves the history partition', () => {
    const { result } = renderHook(useHarness, { wrapper });
    let kidId = '';
    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    act(() => {
      kidId = result.current.profiles.createProfile({ name: 'Alice', isKid: true }).id;
    });
    act(() => {
      result.current.gamification.recordSession(summary());
    });

    act(() => {
      result.current.profiles.deleteProfile(kidId);
    });
    expect(result.current.profiles.profiles.map((p) => p.name)).toEqual(['Orlando']);
    expect(result.current.profiles.activeProfile).toBeNull();
    // the deleted profile's history stays in the storage (the F7 decision)
    expect(window.localStorage.getItem(historyStorageKey(kidId))).not.toBeNull();
  });
});

describe('ProfileProvider: theme and language are independent axes', () => {
  it('switching profile changes the theme and does NOT touch the language', async () => {
    await i18n.changeLanguage('pt-BR');
    const { result } = renderHook(useHarness, { wrapper });

    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    expect(result.current.theme).toBe('adult');
    expect(i18n.resolvedLanguage).toBe('pt-BR');

    act(() => {
      result.current.profiles.createProfile({ name: 'Alice', isKid: true });
    });
    expect(result.current.theme).toBe('kids');
    expect(i18n.resolvedLanguage).toBe('pt-BR');
  });

  it('switching language changes the copy and does NOT touch the active profile theme', async () => {
    const { result } = renderHook(useHarness, { wrapper });
    act(() => {
      result.current.profiles.createProfile({ name: 'Alice', isKid: true });
    });
    expect(document.documentElement.dataset.theme).toBe('kids');

    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
    expect(result.current.theme).toBe('kids');
    expect(document.documentElement.dataset.theme).toBe('kids');
  });

  it('the copy resolves both axes at once (language × theme)', async () => {
    const ironGuard = BADGES.find((b) => b.id === 'iron_guard')!;
    const hooks = QUEST_POOL.find((q) => q.id === 'hooks_20')!;
    const t = i18n.t.bind(i18n);

    expect(badgeName(t, ironGuard, 'adult')).toBe('Iron Guard');
    expect(badgeName(t, ironGuard, 'kids')).toBe('Castle Shield');

    await i18n.changeLanguage('pt-BR');
    expect(badgeName(t, ironGuard, 'adult')).toBe('Guarda de Ferro');
    expect(badgeName(t, ironGuard, 'kids')).toBe('Escudo do Castelo');
    expect(questDescription(t, hooks, 'kids')).toContain('Giro real');
  });

  it('the language is persisted under its own key, separate from the profiles', async () => {
    const { result } = renderHook(useHarness, { wrapper });
    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });

    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });

    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
    expect(window.localStorage.getItem(PROFILES_STORAGE_KEY)).not.toContain('pt-BR');
  });
});
