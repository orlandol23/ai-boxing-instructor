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
 * Integração F7: ProfileProvider + tema no <html> + partição do
 * histórico/gamificação por perfil ativo (localStorage real do jsdom).
 *
 * Também fixa a separação dos dois eixos de copy: o PERFIL escolhe o tema
 * (adult/kids), o IDIOMA é escolhido pelo usuário e persistido à parte —
 * trocar de perfil nunca mexe no idioma, e vice-versa.
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

describe('ProfileProvider — tema e idioma são eixos independentes', () => {
  it('trocar de perfil muda o tema e NÃO mexe no idioma', async () => {
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

  it('trocar de idioma muda a copy e NÃO mexe no tema do perfil ativo', async () => {
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

  it('a copy resolve os dois eixos ao mesmo tempo (idioma × tema)', async () => {
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

  it('o idioma é persistido na sua própria chave, separado dos perfis', async () => {
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
