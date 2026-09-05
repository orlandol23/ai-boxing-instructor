// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  normalizeLocale,
} from '..';
import { BADGES } from '../../engine/gamification/badges';

/**
 * Runtime behaviour of the configured i18next instance.
 *
 * The parity suite proves the data lines up; this proves the *library*
 * resolves it the way the app assumes — in particular that the theme axis
 * really is i18next's `context` suffix, with the adult copy as the
 * fallback when a `_kids` skin is absent.
 */

const original = i18n.language;
afterAll(async () => {
  await i18n.changeLanguage(original);
});

beforeEach(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe('configuration', () => {
  it('starts in English and accepts only the allow-list', () => {
    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.options.fallbackLng).toEqual(['en']);
    expect(i18n.options.supportedLngs).toEqual(expect.arrayContaining([...SUPPORTED_LOCALES]));
  });

  it('detects in the order localStorage → navigator → htmlTag, cached in localStorage', () => {
    const detection = i18n.options.detection;
    expect(detection?.order).toEqual(['localStorage', 'navigator', 'htmlTag']);
    expect(detection?.caches).toEqual(['localStorage']);
    expect(detection?.lookupLocalStorage).toBe(LOCALE_STORAGE_KEY);
    // The project's own storage key (same prefix as the other stores).
    expect(LOCALE_STORAGE_KEY.startsWith('boxing-ai:')).toBe(true);
  });

  it('ships the resources bundled, with no HTTP backend (the PWA renders offline)', () => {
    expect(i18n.options.backend).toBeUndefined();
    for (const locale of SUPPORTED_LOCALES) {
      expect(i18n.hasResourceBundle(locale, 'common')).toBe(true);
    }
  });

  it('normalizeLocale rejects anything outside the allow-list', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt-BR');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('pt')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('en-GB')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(42)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('the selector options cover exactly the supported locales', () => {
    expect(LOCALE_OPTIONS.map((o) => o.code)).toEqual([...SUPPORTED_LOCALES]);
    for (const option of LOCALE_OPTIONS) {
      expect(option.short).toMatch(/^[A-Z]{2}$/);
      expect(i18n.t(option.labelKey)).not.toBe(option.labelKey);
    }
  });
});

describe('the language axis', () => {
  it('switches the language of all the copy', async () => {
    expect(i18n.t('header.back')).toBe('Back');
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('header.back')).toBe('Voltar');
  });

  it('keeps <html lang> in sync with the active language', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('interpolates data in both languages', async () => {
    expect(i18n.t('header.switchProfile', { name: 'Alice' })).toContain('Alice');
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('header.switchProfile', { name: 'Alice' })).toContain('Alice');
  });
});

describe('the theme axis (i18next context)', () => {
  it('resolves the kids skin when it exists', () => {
    const ironGuard = BADGES.find((b) => b.id === 'iron_guard')!;
    expect(i18n.t(ironGuard.nameKey, { context: 'adult' })).toBe('Iron Guard');
    expect(i18n.t(ironGuard.nameKey, { context: 'kids' })).toBe('Castle Shield');
  });

  it('falls back to the adult copy when there is no kids skin', () => {
    const punches = BADGES.find((b) => b.id === 'punches_100')!;
    expect(i18n.t(punches.nameKey, { context: 'kids' })).toBe(
      i18n.t(punches.nameKey, { context: 'adult' })
    );
  });

  it('the two axes are independent: language × theme', async () => {
    const ironGuard = BADGES.find((b) => b.id === 'iron_guard')!;
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t(ironGuard.nameKey, { context: 'adult' })).toBe('Guarda de Ferro');
    expect(i18n.t(ironGuard.nameKey, { context: 'kids' })).toBe('Escudo do Castelo');
  });

  it('combines theme and interpolation in the same call', async () => {
    expect(i18n.t('home.greeting', { context: 'kids', name: 'Alice' })).toContain('Alice');
    await i18n.changeLanguage('pt-BR');
    const kids = i18n.t('home.greeting', { context: 'kids', name: 'Alice' });
    const adult = i18n.t('home.greeting', { context: 'adult', name: 'Alice' });
    expect(kids).toContain('Alice');
    expect(kids).not.toBe(adult);
  });
});
