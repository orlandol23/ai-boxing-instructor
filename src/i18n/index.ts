import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en';
import ptBR from './locales/pt-BR';

/**
 * i18n setup — English by default, PT-BR detected from the browser.
 *
 * Mirrors the sibling project (ai-dlh) on everything that matters for
 * consistency across the portfolio: `fallbackLng: 'en'`, an explicit
 * `supportedLngs` allow-list, detection order
 * `localStorage → navigator → htmlTag` and `caches: ['localStorage']`
 * under a project-specific storage key.
 *
 * ONE deliberate difference: ai-dlh loads namespaces over HTTP
 * (`i18next-http-backend`). This app is offline-first (PWA) and small
 * enough that both bundles cost a couple of KB, so the resources are
 * imported and bundled at build time. Rendering text must never depend
 * on a network fetch here.
 */

export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Project-specific key so localStorage stays namespaced like the stores. */
export const LOCALE_STORAGE_KEY = 'boxing-ai:locale';

export const NAMESPACES = ['common'] as const;

/** Options rendered by the header language selector, in display order. */
export const LOCALE_OPTIONS: readonly {
  code: SupportedLocale;
  /** Language-neutral 2-letter badge shown in the switcher. */
  short: string;
  labelKey: string;
}[] = [
  { code: 'en', short: 'EN', labelKey: 'language.en' },
  { code: 'pt-BR', short: 'PT', labelKey: 'language.ptBR' },
];

export const resources = {
  en: { common: en },
  'pt-BR': { common: ptBR },
};

/** Narrows any string (browser, storage, request body) to a known locale. */
export function normalizeLocale(value: unknown): SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as SupportedLocale)
    : DEFAULT_LOCALE;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
    ns: NAMESPACES,
    defaultNS: 'common',
  });

/** Keeps <html lang> in sync so screen readers and the OS pick the right voice. */
function syncDocumentLang(lng: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = normalizeLocale(lng);
}

syncDocumentLang(i18n.language);
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
