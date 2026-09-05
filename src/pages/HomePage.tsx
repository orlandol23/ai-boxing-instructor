import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Target, Dumbbell, Flame, TrendingUp } from 'lucide-react';
import { useGamification } from '../hooks/useGamification';
import { progressSnapshot } from '../engine/gamification/selectors';
import { useProfiles } from '../contexts/ProfileContext';
import { homeGreeting, rankLabel, uiCopy, useCopy } from '../theme/copy';
import { LevelChip } from '../components/Progress/LevelChip';
import { XpBar } from '../components/Progress/XpBar';

export function HomePage() {
  const navigate = useNavigate();
  const { t, theme } = useCopy();
  const { activeProfile } = useProfiles();
  const { history } = useGamification();
  const progress = useMemo(() => progressSnapshot(history), [history]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto flex min-h-full max-w-xs flex-col items-center justify-center gap-6">
      {/* Logo / Title */}
      <div className="text-center">
        <h1 className="font-display text-display font-extrabold uppercase tracking-wide text-accent">
          {t('app.name')}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {activeProfile
            ? homeGreeting(t, activeProfile.name, theme)
            : uiCopy(t, 'home.tagline', theme)}
        </p>
      </div>

      {/* Progress (F6): LVL chip + XP bar + streak + link to /progress */}
      <section className="w-full max-w-xs rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <LevelChip level={progress.level.level} />
          <span className="font-display text-sm font-bold uppercase tracking-wider text-accent">
            {rankLabel(t, progress.level.level, theme)}
          </span>
        </div>
        <div className="mt-3">
          <XpBar
            current={progress.level.xpIntoLevel}
            total={progress.level.xpForNextLevel}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 text-fg-muted">
            <Flame
              size={16}
              aria-hidden="true"
              className={progress.streak > 0 ? 'text-primary' : 'text-fg-dim'}
            />
            <span className="num font-semibold text-fg">{progress.streak}</span>
            {progress.streak === 1 ? t('home.streakDaysOne') : t('home.streakDaysOther')}
          </span>
          <span className="text-fg-muted">
            {t('home.quests')}{' '}
            <span className="num font-semibold text-fg">{progress.questsDone}/3</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/progress')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-2 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-accent"
        >
          <TrendingUp size={16} aria-hidden="true" />
          {t('home.viewProgress')}
        </button>
      </section>

      {/* Main CTA — Button primary xl (SPECS §6) */}
      <button
        type="button"
        onClick={() => navigate('/training')}
        className="flex min-h-16 w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-primary px-9 font-display text-[22px] font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
      >
        <Swords size={24} aria-hidden="true" />
        {t('home.startTraining')}
      </button>

      {/* Mode cards */}
      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        <ModeCard
          icon={<Target size={24} aria-hidden="true" />}
          title={t('home.modeShadowTitle')}
          description={t('home.modeShadowDescription')}
          onClick={() => navigate('/training')}
        />
        <ModeCard
          icon={<Dumbbell size={24} aria-hidden="true" />}
          title={t('home.modeTechniqueTitle')}
          description={t('home.modeTechniqueDescription')}
          disabled
        />
      </div>

      <p className="text-xs text-fg-dim">{t('home.setupHint')}</p>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-4 text-center transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="text-accent">{icon}</div>
      <span className="font-display text-base font-bold uppercase tracking-wide text-fg">
        {title}
      </span>
      <span className="text-xs text-fg-muted">{description}</span>
    </button>
  );
}
