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
  it('shows one option per supported locale', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /English/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Portuguese/i })).toBeDefined();
  });

  it('marks the active language with aria-pressed', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: /English/i }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: /Portuguese/i }).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('clicking PT switches the app language and the control state', async () => {
    render(<LanguageSelector />);

    await act(async () => {
      screen.getByRole('button', { name: /Portuguese/i }).click();
    });

    expect(i18n.resolvedLanguage).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    // The selector itself is re-rendered in the new language.
    expect(screen.getByRole('button', { name: /Inglês/i }).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('persists the choice in localStorage (it survives a reload)', async () => {
    render(<LanguageSelector />);
    await act(async () => {
      screen.getByRole('button', { name: /Portuguese/i }).click();
    });
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
  });

  it('the group is labelled for screen readers', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeDefined();
  });
});
