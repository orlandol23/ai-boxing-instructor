import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { useProfiles } from '../contexts/ProfileContext';
import {
  AVATARS,
  DEFAULT_AVATAR,
  MAX_PROFILES,
  MAX_PROFILE_NAME_LENGTH,
  type Profile,
} from '../services/profileStore';
import { createHistoryStore } from '../services/historyStore';
import { levelFromTotalXp } from '../engine/gamification/xp';
import { ProfileCard } from '../components/Profiles/ProfileCard';

type FormState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; profile: Profile };

/**
 * Tela /profiles (SPECS §7): seletor de perfis que define o tema do app.
 * Mostrada no primeiro uso (sem perfil ativo) e acessível pelo avatar no
 * Header. Selecionar um perfil troca tema + partição de histórico/XP.
 */
export function ProfilesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profiles, activeProfile, createProfile, updateProfile, deleteProfile, selectProfile } =
    useProfiles();
  const [form, setForm] = useState<FormState>(
    profiles.length === 0 ? { mode: 'create' } : { mode: 'closed' }
  );

  // LVL chip de cada card vem do snapshot de gamificação do próprio
  // perfil (histórico particionado por profileId no HistoryStore).
  const historyStore = useMemo(() => createHistoryStore(), []);
  const levels = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of profiles) {
      map.set(p.id, levelFromTotalXp(historyStore.load(p.id).totalXp).level);
    }
    return map;
  }, [historyStore, profiles]);

  const handleSelect = (id: string) => {
    selectProfile(id);
    navigate('/');
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="text-center">
          <h1 className="font-display text-title font-extrabold uppercase tracking-wide text-fg">
            {t('profiles.title')}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">{t('profiles.subtitle')}</p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              level={levels.get(profile.id) ?? 1}
              selected={profile.id === activeProfile?.id}
              onSelect={() => handleSelect(profile.id)}
              onEdit={() => setForm({ mode: 'edit', profile })}
            />
          ))}

          {profiles.length < MAX_PROFILES && (
            <button
              type="button"
              onClick={() => setForm({ mode: 'create' })}
              className="flex min-h-[180px] flex-col items-center justify-center gap-2.5 rounded-[20px] border border-dashed border-line-strong bg-surface p-4 text-fg-muted transition-colors hover:border-accent hover:text-fg"
            >
              <span className="flex size-[68px] items-center justify-center rounded-full border-2 border-dashed border-line-strong">
                <Plus size={28} aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold uppercase tracking-wide">
                {t('profiles.newProfile')}
              </span>
            </button>
          )}
        </div>

        {form.mode !== 'closed' && (
          <ProfileForm
            key={form.mode === 'edit' ? form.profile.id : 'create'}
            profile={form.mode === 'edit' ? form.profile : null}
            canDismiss={profiles.length > 0}
            onCancel={() => setForm({ mode: 'closed' })}
            onCreate={(draft) => {
              createProfile(draft);
              navigate('/');
            }}
            onSave={(id, patch) => {
              updateProfile(id, patch);
              setForm({ mode: 'closed' });
            }}
            onDelete={(id) => {
              deleteProfile(id);
              setForm({ mode: 'closed' });
            }}
          />
        )}
      </div>
    </main>
  );
}

interface ProfileFormProps {
  /** null = criação; preenchido = edição. */
  profile: Profile | null;
  /** Primeiro uso (nenhum perfil) não deixa fechar o formulário. */
  canDismiss: boolean;
  onCancel: () => void;
  onCreate: (draft: { name: string; avatar: string; isKid: boolean }) => void;
  onSave: (id: string, patch: { name: string; avatar: string; isKid: boolean }) => void;
  onDelete: (id: string) => void;
}

function ProfileForm({ profile, canDismiss, onCancel, onCreate, onSave, onDelete }: ProfileFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? DEFAULT_AVATAR);
  const [isKid, setIsKid] = useState(profile?.isKid ?? false);
  // Exclusão exige confirmação dupla: 1º toque arma, 2º toque confirma
  // (desarma sozinho depois de alguns segundos).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    []
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    if (profile) onSave(profile.id, { name: trimmed, avatar, isKid });
    else onCreate({ name: trimmed, avatar, isKid });
  };

  const handleDelete = () => {
    if (!profile) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmingDelete(false), 5000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    onDelete(profile.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-4"
      aria-label={
        profile
          ? t('profiles.editProfileNamed', { name: profile.name })
          : t('profiles.createProfile')
      }
    >
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-fg">
        {profile ? t('profiles.editProfile') : t('profiles.createProfile')}
      </h2>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-fg">
        {t('profiles.name')}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_PROFILE_NAME_LENGTH}
          required
          autoFocus={!profile}
          placeholder={t('profiles.namePlaceholder')}
          className="min-h-12 rounded-md border border-line-strong bg-surface-2 px-3 text-base font-normal text-fg placeholder:text-fg-dim"
        />
      </label>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-fg">{t('profiles.avatar')}</legend>
        <div className="grid grid-cols-6 gap-1.5">
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              aria-pressed={avatar === emoji}
              aria-label={t('profiles.avatarOption', { emoji })}
              className={`flex items-center justify-center rounded-md border text-2xl transition-colors ${
                avatar === emoji
                  ? 'border-accent bg-surface-2 [box-shadow:var(--glow-accent)]'
                  : 'border-line bg-surface-2/50 hover:border-line-strong'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Setting row (SPECS §6): switch 48×28, ligado = --primary */}
      <button
        type="button"
        role="switch"
        aria-checked={isKid}
        onClick={() => setIsKid((v) => !v)}
        className="flex min-h-14 items-center justify-between border-t border-line pt-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-fg">{t('profiles.kidsMode')}</span>
          <span className="block text-xs text-fg-muted">{t('profiles.kidsModeHint')}</span>
        </span>
        <span
          aria-hidden="true"
          className={`relative inline-block h-7 w-12 shrink-0 rounded-full transition-colors ${
            isKid ? 'bg-primary' : 'bg-surface-2 border border-line-strong'
          }`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-fg transition-[left] ${
              isKid ? 'left-6' : 'left-1'
            }`}
          />
        </span>
      </button>

      <div className="flex gap-2.5">
        <button
          type="submit"
          className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96]"
        >
          {profile ? t('profiles.save') : t('profiles.createAndTrain')}
        </button>
        {canDismiss && (
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-line-strong bg-surface-2 font-display text-lg font-bold uppercase tracking-wider text-fg transition-colors hover:border-accent"
          >
            {t('profiles.cancel')}
          </button>
        )}
      </div>

      {profile && (
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={handleDelete}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
              confirmingDelete
                ? 'border-score-bad bg-score-bad/15 text-score-bad'
                : 'border-line-strong text-fg-muted hover:border-score-bad hover:text-score-bad'
            }`}
          >
            <Trash2 size={16} aria-hidden="true" />
            {confirmingDelete ? t('profiles.deleteConfirm') : t('profiles.delete')}
          </button>
          <p className="mt-2 text-xs text-fg-dim">{t('profiles.deleteHint')}</p>
        </div>
      )}
    </form>
  );
}
