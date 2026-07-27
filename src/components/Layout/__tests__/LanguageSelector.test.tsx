// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { LanguageSelector } from '../LanguageSelector';
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '../../../i18n';

/**
 * The header's EN/PT switcher — the one control an international visitor
 * has to find. Covers what actually matters: it reflects the active
 * language, switching it re-renders the app's copy, and the choice is
 * announced to assistive tech and remembered across reloads.
 */

beforeEach(async () => {
  window.localStorage.clear();
  await act(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });
});

afterEach(async () => {
  // `globals` is off in vitest.config.ts, so Testing Library's automatic
  // cleanup hook never registers — unmount explicitly.
  cleanup();
  await act(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });
});

describe('LanguageSelector', () => {
  it('mostra uma opção por locale suportado', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /English/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Portuguese/i })).toBeDefined();
  });

  it('marca o idioma ativo com aria-pressed', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /English/i }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: /Portuguese/i }).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('clicar em PT troca o idioma do app e o estado do controle', async () => {
    render(<LanguageSelector />);

    await act(async () => {
      screen.getByRole('button', { name: /Portuguese/i }).click();
    });

    expect(i18n.resolvedLanguage).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    // O próprio seletor é re-renderizado no novo idioma.
    expect(screen.getByRole('button', { name: /Inglês/i }).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('persiste a escolha em localStorage (sobrevive ao reload)', async () => {
    render(<LanguageSelector />);
    await act(async () => {
      screen.getByRole('button', { name: /Portuguese/i }).click();
    });
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
  });

  it('o grupo é rotulado p/ leitores de tela', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeDefined();
  });
});
