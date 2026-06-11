/**
 * Tema runtime do Design System v2.
 *
 * Os tokens em src/styles/globals.css definem dois temas sobre o mesmo
 * sistema de componentes, selecionados via atributo `data-theme` no <html>:
 * - 'adult' — Fight Night (default)
 * - 'kids'  — Arcade Royale (pronto nos tokens; a UI de troca chega com o
 *   seletor de perfis na Fase 7)
 */
export type Theme = 'adult' | 'kids';

export const DEFAULT_THEME: Theme = 'adult';

/** Aplica o tema no <html data-theme="...">. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Lê o tema atual do <html> (fallback: default). */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'kids' ? 'kids' : DEFAULT_THEME;
}
