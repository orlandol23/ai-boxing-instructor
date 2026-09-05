import { RotateCcw, Home, ChevronsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PunchType, SessionSummary as SessionSummaryData } from '../../engine/types';
import type { CoachFeedbackStatus } from '../../hooks/useCoachingFeedback';
import type { SessionGains } from '../../engine/gamification/applySession';
import { rankLabel, useCopy } from '../../theme/copy';
import { CoachBubble } from './CoachBubble';
import { LevelChip } from '../Progress/LevelChip';
import { XpBar } from '../Progress/XpBar';
import { MedalBadge } from '../Progress/MedalBadge';
import { QuestCard } from '../Progress/QuestCard';

interface SessionSummaryProps {
  summary: SessionSummaryData;
  /** The session's gamification gains (null for a session with no rounds). */
  gains?: SessionGains | null;
  /** AI coach state ('idle' hides the section, e.g. a session with no rounds). */
  coachStatus?: CoachFeedbackStatus;
  coachFeedback?: string | null;
  onRestart: () => void;
  onHome: () => void;
}

function durationParts(ms: number): { minutes: number; seconds: string } {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: (totalSeconds % 60).toString().padStart(2, '0'),
  };
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-score-good';
  if (score >= 65) return 'text-score-warn';
  return 'text-score-bad';
}

export function SessionSummary({
  summary,
  gains = null,
  coachStatus = 'idle',
  coachFeedback = null,
  onRestart,
  onHome,
}: SessionSummaryProps) {
  const { t, theme } = useCopy();
  const { i18n } = useTranslation();
  const punches = (Object.keys(summary.punchBreakdown) as PunchType[])
    .map((type) => ({ type, count: summary.punchBreakdown[type] }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay backdrop-blur-sm">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-5">
        <header className="text-center">
          <h2 className="font-display text-title font-extrabold uppercase tracking-wide text-fg">
            {t('summary.title')}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {summary.rounds}{' '}
            {summary.rounds === 1 ? t('summary.roundsOne') : t('summary.roundsOther')} ·{' '}
            {t('summary.duration', durationParts(summary.duration))} · {t('summary.mode')}
          </p>
        </header>

        {/* The session's XP + level (F6) */}
        {gains && (
          <section className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="text-center">
              <span className="num text-hud-value font-bold text-xp">
                +{gains.totalSessionXp.toLocaleString(i18n.resolvedLanguage)}
              </span>
              <span className="ml-1 font-display text-lg font-bold uppercase text-xp">XP</span>
              <p className="mt-1 text-xs text-fg-muted">
                {t('summary.xpPunches')}{' '}
                <span className="num text-fg">{gains.xp.punchXp}</span> ·{' '}
                {t('summary.xpRoundBonus')}{' '}
                <span className="num text-fg">{gains.xp.roundBonusXp}</span> ·{' '}
                {t('summary.xpQuests')} <span className="num text-fg">{gains.questXp}</span>
              </p>
            </div>

            {gains.leveledUp && (
              <p className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-accent bg-surface px-3 py-2 text-sm font-semibold text-accent-light">
                <ChevronsUp size={16} aria-hidden="true" />
                {t('summary.levelUp', {
                  from: gains.levelBefore.level,
                  to: gains.levelAfter.level,
                })}
                {gains.rankAfter !== gains.rankBefore &&
                  ` · ${rankLabel(t, gains.levelAfter.level, theme)}`}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3">
              <LevelChip level={gains.levelAfter.level} />
              <XpBar
                current={gains.levelAfter.xpIntoLevel}
                total={gains.levelAfter.xpForNextLevel}
              />
            </div>
          </section>
        )}

        {/* averages and volume: the number always sits next to the colour (SPECS §2) */}
        <section className="grid grid-cols-3 gap-2.5">
          <Stat
            label={t('summary.guard')}
            value={Math.round(summary.avgGuardScore).toString()}
            valueClass={scoreColor(summary.avgGuardScore)}
          />
          <Stat
            label={t('summary.base')}
            value={Math.round(summary.avgBaseScore).toString()}
            valueClass={scoreColor(summary.avgBaseScore)}
          />
          <Stat label={t('summary.punches')} value={String(summary.totalPunches)} />
        </section>

        {punches.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              {t('summary.punchDistribution')}
            </h3>
            <ul className="flex flex-col gap-1">
              {punches.map(({ type, count }) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-fg">{t(`punchType.${type}`)}</span>
                  <span className="num text-lg font-bold leading-none text-fg">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.corrections.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              {t('summary.workOn')}
            </h3>
            <ul className="flex flex-col gap-1">
              {summary.corrections.map((note, i) => (
                <li
                  key={`${note.key}-${i}`}
                  className="rounded-md border-l-2 border-score-bad bg-surface-2 px-3 py-2 text-sm text-fg"
                >
                  {t(note.key, note.params)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.highlights.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              {t('summary.highlights')}
            </h3>
            <ul className="flex flex-col gap-1">
              {summary.highlights.map((note, i) => (
                <li
                  key={`${note.key}-${i}`}
                  className="rounded-md border-l-2 border-score-good bg-surface-2 px-3 py-2 text-sm text-fg"
                >
                  {t(note.key, note.params)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {gains && gains.newBadges.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              {gains.newBadges.length === 1
                ? t('summary.newBadgeOne')
                : t('summary.newBadgeOther')}
            </h3>
            <div className="flex flex-wrap justify-center gap-4 rounded-xl border border-accent bg-surface-2 p-3">
              {gains.newBadges.map((badge) => (
                <MedalBadge key={badge.id} badge={badge} unlocked size="sm" />
              ))}
            </div>
          </section>
        )}

        {gains && gains.quests.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              {t('summary.todaysQuests')}
            </h3>
            <div className="flex flex-col gap-1.5">
              {gains.quests.map((status) => (
                <QuestCard key={status.quest.id} status={status} />
              ))}
            </div>
          </section>
        )}

        {coachStatus !== 'idle' && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              {t('coach.title')}
            </h3>
            <CoachBubble status={coachStatus} feedback={coachFeedback} context="session" />
          </section>
        )}

        <footer className="mt-2 flex gap-2.5">
          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
          >
            <RotateCcw size={18} aria-hidden="true" />
            {t('summary.trainAgain')}
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-2 font-display text-lg font-bold uppercase tracking-wider text-fg transition-[border-color,transform] hover:border-accent active:scale-[.96]"
          >
            <Home size={18} aria-hidden="true" />
            {t('summary.home')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-surface-2 px-2 py-3 text-center">
      <span className={`num text-2xl font-bold leading-none ${valueClass ?? 'text-fg'}`}>
        {value}
      </span>
      <span className="mt-1 text-[11px] uppercase tracking-wider text-fg-muted">{label}</span>
    </div>
  );
}
