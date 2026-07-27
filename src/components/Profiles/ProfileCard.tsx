import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../../services/profileStore';
import { LevelChip } from '../Progress/LevelChip';

interface ProfileCardProps {
  profile: Profile;
  /** Nível atual do perfil (snapshot de gamificação do histórico dele). */
  level: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

/**
 * Profile card (SPECS §6): radius 20, avatar 64–72 com borda `--accent`,
 * nome display uppercase, LVL chip; selecionado = borda `--accent` +
 * glow (no adulto o token de glow vale `none`).
 */
export function ProfileCard({ profile, level, selected, onSelect, onEdit }: ProfileCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`relative flex flex-col items-center gap-2.5 rounded-[20px] border bg-surface p-4 pt-5 transition-colors ${
        selected
          ? 'border-accent [box-shadow:var(--glow-accent)]'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={t(profile.isKid ? 'profiles.trainAsKid' : 'profiles.trainAs', {
          name: profile.name,
        })}
        className="flex flex-col items-center gap-2.5"
      >
        <span
          aria-hidden="true"
          className="flex size-[68px] items-center justify-center rounded-full border-2 border-accent bg-surface-2 text-4xl"
        >
          {profile.avatar}
        </span>
        <span className="max-w-full truncate font-display text-lg font-bold uppercase tracking-wide text-fg">
          {profile.name}
        </span>
      </button>
      <LevelChip level={level} />
      {profile.isKid && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-light">
          {t('profiles.kidsMode')}
        </span>
      )}
      <button
        type="button"
        onClick={onEdit}
        aria-label={t('profiles.editProfileNamed', { name: profile.name })}
        className="absolute right-1 top-1 flex items-center justify-center rounded-full text-fg-dim transition-colors hover:text-fg"
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
