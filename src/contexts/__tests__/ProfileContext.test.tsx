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

/**
 * Integração F7: ProfileProvider + tema no <html> + partição do
 * histórico/gamificação por perfil ativo (localStorage real do jsdom).
 */

function wrapper({ children }: { children: ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}

function useHarness() {
  return { profiles: useProfiles(), gamification: useGamification(), theme: useAppTheme() };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset.theme = 'adult';
});

describe('ProfileProvider — tema segue o perfil ativo', () => {
  it('primeiro uso: sem perfil ativo, tema adulto', () => {
    const { result } = renderHook(useHarness, { wrapper });
    expect(result.current.profiles.activeProfile).toBeNull();
    expect(result.current.theme).toBe('adult');
    expect(document.documentElement.dataset.theme).toBe('adult');
  });

  it('criar/trocar perfil aplica o tema no <html> (kids ↔ adult)', () => {
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

  it('alternar o modo kids do perfil ativo retemiza na hora', () => {
    const { result } = renderHook(useHarness, { wrapper });
    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    act(() => {
      result.current.profiles.updateProfile(DEFAULT_PROFILE_ID, { isKid: true });
    });
    expect(document.documentElement.dataset.theme).toBe('kids');
  });

  it('boot: monta já com o tema do último perfil ativo persistido', () => {
    const { doc } = createProfile(emptyProfilesDocument(), { name: 'Alice', isKid: true });
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(doc));

    const { result } = renderHook(useHarness, { wrapper });
    expect(result.current.profiles.activeProfile?.name).toBe('Alice');
    expect(document.documentElement.dataset.theme).toBe('kids');
  });
});

describe('ProfileProvider + useGamification — partição por perfil', () => {
  it('trocar de perfil troca a partição de XP/histórico (e volta intacta)', () => {
    const { result } = renderHook(useHarness, { wrapper });

    act(() => {
      result.current.profiles.createProfile({ name: 'Orlando' });
    });
    act(() => {
      result.current.gamification.recordSession(summary());
    });
    const adultXp = result.current.gamification.history.totalXp;
    expect(adultXp).toBeGreaterThan(0);

    // Perfil kids novo começa do zero, gravando em outra chave…
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

    // …e voltar ao perfil adulto recupera o XP dele, sem mistura.
    act(() => {
      result.current.profiles.selectProfile(DEFAULT_PROFILE_ID);
    });
    expect(result.current.gamification.history.profileId).toBe(DEFAULT_PROFILE_ID);
    expect(result.current.gamification.history.totalXp).toBe(adultXp);
  });

  it('deletar perfil esconde mas preserva a partição de histórico', () => {
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
    // histórico do perfil deletado continua no storage (decisão do F7)
    expect(window.localStorage.getItem(historyStorageKey(kidId))).not.toBeNull();
  });
});
