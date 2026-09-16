import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Target, Dumbbell, Flame, TrendingUp } from 'lucide-react';
import { useGamification } from '../hooks/useGamification';
import { progressSnapshot } from '../engine/gamification/selectors';
import { useProfiles } from '../contexts/ProfileContext';
import { homeGreeting, rankLabel, uiCopy, useCopy } from '../theme/copy';
import { LevelChip } from '../components/Progress/LevelChip';
import { XpBar } from '../components/Progress/XpBar';

/**
 * Home, phase 2 (Round Tape / Cornerboard): the page reads like preparation
 * at the corner before a round. Top→bottom:
 *   1. the next round — prompt + the one red action (→ /training);
 *   2. preparation guidance before the bell (documented setup only);
 *   3. "your corner" — compact real progress summary (snapshot values only);
 *   4. secondary access to the training log (→ /progress);
 *   5. modes — Shadow available, Technique honestly planned (disabled).
 * Gamification supports the round narrative; it never outranks it.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { t, themed, theme } = useCopy();
  const { activeProfile } = useProfiles();
  const { history } = useGamification();
  const progress = useMemo(() => progressSnapshot(history), [history]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto flex w-full max-w-xs flex-col gap-6">
        {/* Greeting: the active profile, or the tagline before one exists */}
        <p className="text-center text-sm text-fg-muted">
          {activeProfile
            ? homeGreeting(t, activeProfile.name, theme)
            : uiCopy(t, 'home.tagline', theme)}
        </p>

        {/* 1 — The next round (primary zone, the corner before the bell) */}
        <section
          aria-labelledby="home-round-heading"
          className="rounded-2xl border border-line-strong bg-surface p-6"
        >
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-fg-dim">
            {t('home.roundKicker')}
          </p>
          <h1
            id="home-round-heading"
            className="mt-2 font-display text-title font-bold uppercase text-fg"
          >
            {themed('home.roundPrompt')}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">{t('home.roundSub')}</p>

          {/* Primary CTA — Button primary xl (SPECS §6); unchanged /training route */}
          <button
            type="button"
            onClick={() => navigate('/training')}
            className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-primary px-9 font-display text-[22px] font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
          >
            <Swords size={24} aria-hidden="true" />
            {t('home.startTraining')}
          </button>
        </section>

        {/* 2 — Preparation guidance (a quiet tape rail, not another box) */}
        <section aria-labelledby="home-prep-heading">
          <h2
            id="home-prep-heading"
            className="text-xs font-semibold uppercase tracking-widest text-fg-dim"
          >
            {t('home.prepTitle')}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 border-l-2 border-line-strong pl-3 text-sm text-fg-muted">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-fg-dim" />
              <span>{t('home.setupHint')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-fg-dim" />
              <span>{t('home.setupFrame')}</span>
            </li>
          </ul>
        </section>


        {/* 3 — Your corner: compact progress summary (snapshot values only) */}
        <section
          aria-labelledby="home-corner-heading"
          className="rounded-xl border border-line bg-surface p-4"
        >
          <h2
            id="home-corner-heading"
            className="text-xs font-semibold uppercase tracking-widest text-fg-dim"
          >
            {t('home.cornerTitle')}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-2">
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
        </section>

        {/* 4 — Training log (secondary access to /progress) */}
        <button
          type="button"
          onClick={() => navigate('/progress')}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-2 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-accent"
        >
          <TrendingUp size={16} aria-hidden="true" />
          {t('home.viewProgress')}
        </button>

        {/* 5 — Modes: Shadow available, Technique planned (never clickable) */}
        <section aria-labelledby="home-modes-heading">
          <h2
            id="home-modes-heading"
            className="text-xs font-semibold uppercase tracking-widest text-fg-dim"
          >
            {t('home.modesTitle')}
          </h2>
          <div className="mt-2 grid w-full grid-cols-2 gap-3">
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
        </section>
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
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-4 text-center transition-colors hover:border-accent disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-50 disabled:hover:border-line"
    >
      <div className={disabled ? 'text-fg-dim' : 'text-accent'}>{icon}</div>
      <span className="font-display text-base font-bold uppercase tracking-wide text-fg">
        {title}
      </span>
      <span className="text-xs text-fg-muted">{description}</span>
    </button>
  );
}
