/**
 * Runtime theme of Design System v2.
 *
 * The tokens in src/styles/globals.css define two themes over the same
 * component system, selected through the `data-theme` attribute on <html>:
 * - 'adult': Fight Night (default)
 * - 'kids':  Arcade Royale (switched on by the profile with `isKid` in the
 *   /profiles selector, ProfileContext, F7)
 */
export type Theme = 'adult' | 'kids';

export const DEFAULT_THEME: Theme = 'adult';

/** Applies the theme to <html data-theme="...">. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Reads the current theme from <html> (falls back to the default). */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'kids' ? 'kids' : DEFAULT_THEME;
}
