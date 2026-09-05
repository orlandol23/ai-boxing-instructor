import { ArrowLeft, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfiles } from '../../contexts/ProfileContext';
import { LanguageSelector } from './LanguageSelector';

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProfile } = useProfiles();
  const isHome = location.pathname === '/';

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4">
      {isHome ? (
        <span className="font-display text-xl font-bold uppercase tracking-wide text-accent">
          {t('app.name')}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[15px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {t('header.back')}
        </button>
      )}

      <div className="flex items-center gap-2">
        <LanguageSelector />

        {/* The active profile's avatar, which opens the /profiles selector (F7) */}
        {activeProfile && (
          <button
            type="button"
            onClick={() => navigate('/profiles')}
            aria-label={t('header.switchProfile', { name: activeProfile.name })}
            className="flex items-center justify-center"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full border-2 border-accent bg-surface-2 text-lg"
            >
              {activeProfile.avatar}
            </span>
          </button>
        )}
        <button
          type="button"
          className="flex items-center justify-center text-fg-dim cursor-default"
          aria-label={t('header.settings')}
          disabled
        >
          <Settings size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
