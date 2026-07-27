import { useTranslation } from 'react-i18next';
import { LOCALE_OPTIONS, normalizeLocale } from '../../i18n';

/**
 * EN/PT switcher for the header.
 *
 * Built from the same primitives as the other header controls: `--surface-2`
 * fill on a `--line-strong` border, `font-display` uppercase micro-label,
 * `text-fg-muted → text-fg` on hover, and the active segment filled with
 * `--primary` exactly like the app's other "on" states (voice toggle, kids
 * switch). Two segments only, so a segmented control beats a <select>: one
 * tap to switch, no native picker, and it stays legible at HUD distance.
 */
export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const active = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="flex items-center gap-0.5 rounded-full border border-line-strong bg-surface-2 p-0.5"
    >
      {LOCALE_OPTIONS.map((option) => {
        const selected = option.code === active;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => void i18n.changeLanguage(option.code)}
            aria-pressed={selected}
            aria-label={t('language.switchTo', { language: t(option.labelKey) })}
            className={`rounded-full px-2 py-1 font-display text-xs font-bold uppercase leading-none tracking-wider transition-colors ${
              selected
                ? 'bg-primary text-on-primary'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
