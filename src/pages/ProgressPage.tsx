import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Target } from 'lucide-react';
import { useProfiles } from '../contexts/ProfileContext';
import { useGamification } from '../hooks/useGamification';
import { BADGES } from '../engine/gamification/badges';
import { progressSnapshot, weeklyChartData } from '../engine/gamification/selectors';
import { rankLabel, uiCopy, useCopy } from '../theme/copy';
import { LevelChip } from '../components/Progress/LevelChip';
import { XpBar } from '../components/Progress/XpBar';
import { MedalBadge } from '../components/Progress/MedalBadge';
import { QuestCard } from '../components/Progress/QuestCard';
import { WeeklyChart } from '../components/Progress/WeeklyChart';

function formatSessionDate(value: number, lang: string | undefined): string {
  return new Intl.DateTimeFormat(lang ?? 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function scoreStateLabel(avgGuard: number, avgBase: number, t: (key: string) => string): string {
  if (avgGuard >= 85 && avgBase >= 85) return t('progress.completed');
  if (avgGuard >= 70 && avgBase >= 70) return t('progress.passed');
  if (avgGuard > 0 || avgBase > 0) return t('progress.belowThreshold');
  return t('progress.notAttempted');
}

/**
 * The /progress screen (SPECS §7): training-log first, progression second.
 */
export function ProgressPage() {
  const { t, theme } = useCopy();
  const { i18n } = useTranslation();
  const { activeProfile } = useProfiles();
  const { history } = useGamification();
  const progress = useMemo(() => progressSnapshot(history), [history]);
  const week = useMemo(() => weeklyChartData(history), [history]);
  const recentSessions = useMemo(
    () => [...history.sessions].sort((a, b) => b.endedAt - a.endedAt).slice(0, 4),
    [history.sessions]
  );

  const unlockedIds = new Set(history.unlockedBadges.map((b) => b.id));
  const nextQuest = progress.quests.find((q) => !q.done);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-dim">
                {t('progress.trainingLog')}
              </p>
              <h1 className="mt-1 font-display text-title font-extrabold uppercase tracking-wide text-fg">
                {activeProfile ? activeProfile.name : t('progress.title')}
              </h1>
            </div>
            <LevelChip level={progress.level.level} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="font-display text-lg font-bold uppercase tracking-wider text-accent">
              {rankLabel(t, progress.level.level, theme)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
              <Flame
                size={16}
                aria-hidden="true"
                className={progress.streak > 0 ? 'text-primary' : 'text-fg-dim'}
              />
              <span className="num font-semibold text-fg">{progress.streak}</span>
              {progress.streak === 1 ? t('home.streakDaysOne') : t('home.streakDaysOther')}
            </span>
          </div>

          <div className="mt-3">
            <XpBar current={progress.level.xpIntoLevel} total={progress.level.xpForNextLevel} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetricPill label={t('progress.totalSessions')} value={history.lifetime.sessions.toString()} />
            <MetricPill label={t('progress.totalRounds')} value={history.lifetime.rounds.toString()} />
            <MetricPill label={t('progress.totalPunches')} value={history.lifetime.punches.toString()} />
          </div>
        </header>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-dim">
              {t('progress.summary')}
            </h2>
            <span className="num text-sm text-fg-muted">
              {t('progress.total')} {history.totalXp.toLocaleString(i18n.resolvedLanguage)} XP
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              label={t('progress.totalSessions')}
              value={String(history.lifetime.sessions)}
              hint={t('progress.logged')}
            />
            <MetricTile
              label={t('progress.totalRounds')}
              value={String(history.lifetime.rounds)}
              hint={t('progress.roundsRecord')}
            />
            <MetricTile
              label={t('progress.totalPunches')}
              value={String(history.lifetime.punches)}
              hint={t('progress.punchesThrown')}
            />
            <MetricTile
              label={t('progress.streak')}
              value={String(progress.streak)}
              hint={progress.streak === 1 ? t('home.streakDaysOne') : t('home.streakDaysOther')}
            />
          </div>
        </section>

        <WeeklyChart days={week} />

        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-dim">
              {t('progress.recentRounds')}
            </h2>
            <span className="num text-sm text-fg-muted">{recentSessions.length}</span>
          </div>

          {recentSessions.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-fg-muted">
              <p className="font-semibold text-fg">{t('progress.emptyTitle')}</p>
              <p className="mt-1">{t('progress.emptyBody')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const status = scoreStateLabel(session.avgGuardScore, session.avgBaseScore, t);
                return (
                  <div
                    key={session.id}
                    className="rounded-[16px] border border-line bg-surface-2 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base font-bold uppercase tracking-wide text-fg">
                          {t('progress.roundRecord')} {session.rounds}
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {formatSessionDate(session.endedAt, i18n.resolvedLanguage)}
                        </p>
                      </div>
                      <span className="num rounded-full border border-line-strong bg-surface px-2 py-1 text-xs font-bold uppercase tracking-wider text-fg">
                        {status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-fg-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Target size={14} aria-hidden="true" className="text-accent" />
                        <span className="num text-fg">{session.totalPunches}</span>
                        <span>{t('training.punches')}</span>
                      </span>
                      <span className="num text-fg">
                        {session.avgGuardScore.toFixed(0)} / {session.avgBaseScore.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-dim">
              {t('progress.nextQuest')}
            </h2>
            <span className="num text-sm text-fg-muted">
              {t('progress.questsToday', { done: progress.questsDone, total: 3 })}
            </span>
          </div>
          {nextQuest ? (
            <QuestCard status={nextQuest} />
          ) : (
            <p className="rounded-[14px] border border-accent bg-surface p-3 text-sm font-semibold text-accent-light">
              {uiCopy(t, 'home.questsAllDone', theme)}
            </p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between text-xs uppercase tracking-[0.2em] text-fg-dim">
            <h2>{t('progress.achievements')}</h2>
            <span className="num normal-case tracking-normal text-fg-muted">
              {unlockedIds.size}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4">
            {BADGES.map((badge) => (
              <MedalBadge key={badge.id} badge={badge} unlocked={unlockedIds.has(badge.id)} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-fg-dim">{label}</p>
      <p className="num mt-1 text-xl font-bold text-fg">{value}</p>
    </div>
  );
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-fg-dim">{label}</p>
      <p className="num mt-2 text-2xl font-bold text-fg">{value}</p>
      <p className="mt-1 text-xs text-fg-muted">{hint}</p>
    </div>
  );
}
