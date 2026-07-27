import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../contexts/ProfileContext';
import type { Theme } from './theme';
import type { QuestDefinition } from '../engine/gamification/quests';
import type { BadgeDefinition } from '../engine/gamification/badges';
import { rankLabelKey } from '../engine/gamification/xp';

/**
 * Copy resolution across TWO independent axes (SPECS §8.3).
 *
 *   language  →  i18next resource bundles  (src/i18n/locales/{en,pt-BR}.ts)
 *   theme     →  i18next `context` suffix  (`_kids`), resolved here
 *
 * Neither axis is flattened into the other: adding a locale never touches
 * this file, and adding a themed string never touches the i18n config.
 * A key with no `_kids` entry falls back to the base (adult) copy, which
 * is exactly the "skin is optional" rule the kids theme has always had —
 * a brand-new quest or badge can never break the kids theme.
 *
 * Golden rule unchanged: only the *skin* varies. Goals, metrics and
 * technical feedback (guard, base, punch quality) are identical in both
 * themes — precision > theme.
 */

/** Minimal contract this module needs from i18next's `t`. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Resolves `key` in the active language, in the given theme's skin. */
export function themedCopy(
  t: Translate,
  key: string,
  theme: Theme,
  options: Record<string, unknown> = {}
): string {
  return t(key, { context: theme, ...options });
}

/* ------------------------------------------------------------ UI geral */

/** UI strings whose *skin* changes with the theme (not their meaning). */
export const THEMED_UI_KEYS = ['home.tagline', 'home.questsAllDone'] as const;

export type UiCopyKey = (typeof THEMED_UI_KEYS)[number];

export function uiCopy(t: Translate, key: UiCopyKey, theme: Theme): string {
  return themedCopy(t, key, theme);
}

/** Saudação da Home com o nome do perfil ativo. */
export function homeGreeting(t: Translate, name: string, theme: Theme): string {
  return themedCopy(t, 'home.greeting', theme, { name });
}

/* ----------------------------------------------------- missões diárias */

export function questDescription(
  t: Translate,
  quest: Pick<QuestDefinition, 'descriptionKey'>,
  theme: Theme
): string {
  return themedCopy(t, quest.descriptionKey, theme);
}

/* --------------------------------------------------------------- badges */

export function badgeName(
  t: Translate,
  badge: Pick<BadgeDefinition, 'nameKey'>,
  theme: Theme
): string {
  return themedCopy(t, badge.nameKey, theme);
}

/** O critério técnico nunca muda com o tema. */
export function badgeDescription(
  t: Translate,
  badge: Pick<BadgeDefinition, 'descriptionKey'>
): string {
  return t(badge.descriptionKey);
}

/* ---------------------------------------------------------------- ranks */

/** Cinturões no adulto, coroas no kids (SPECS §1). */
export function rankLabel(t: Translate, level: number, theme: Theme): string {
  return themedCopy(t, rankLabelKey(level), theme);
}

/* ----------------------------------------------------------------- hook */

export interface CopyBundle {
  /** Plain translation in the active language. */
  t: Translate;
  /** Translation in the active language *and* the active theme's skin. */
  themed: Translate;
  theme: Theme;
}

/**
 * Both axes at once for components: `t` for neutral copy, `themed` for
 * copy that has a kids skin. Components never build the `_kids` suffix
 * themselves.
 */
export function useCopy(): CopyBundle {
  const { t: rawT } = useTranslation();
  const theme = useAppTheme();

  const t = useCallback<Translate>((key, options) => rawT(key, options), [rawT]);
  const themed = useCallback<Translate>(
    (key, options) => rawT(key, { context: theme, ...options }),
    [rawT, theme]
  );

  return useMemo(() => ({ t, themed, theme }), [t, themed, theme]);
}
