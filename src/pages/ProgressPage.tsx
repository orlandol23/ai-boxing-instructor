import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { useGamification } from '../hooks/useGamification';
import { BADGES } from '../engine/gamification/badges';
import { progressSnapshot, weeklyChartData } from '../engine/gamification/selectors';
import { rankLabel, uiCopy, useCopy } from '../theme/copy';
import { LevelChip } from '../components/Progress/LevelChip';
import { XpBar } from '../components/Progress/XpBar';
import { MedalBadge } from '../components/Progress/MedalBadge';
import { QuestCard } from '../components/Progress/QuestCard';
import { WeeklyChart } from '../components/Progress/WeeklyChart';

/**
 * Tela /progress (SPECS §7): nível/rank + XP bar, gráfico semanal,
 * grid de badges (locked em grayscale) e a próxima missão do dia.
 */
export function ProgressPage() {
  const { t, theme } = useCopy();
  const { i18n } = useTranslation();
  const { history } = useGamification();
  const progress = useMemo(() => progressSnapshot(history), [history]);
  const week = useMemo(() => weeklyChartData(history), [history]);

  const unlockedIds = new Set(history.unlockedBadges.map((b) => b.id));
  const nextQuest = progress.quests.find((q) => !q.done);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        {/* Nível, rank e XP */}
        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <LevelChip level={progress.level.level} />
            <span className="font-display text-lg font-bold uppercase tracking-wider text-accent">
              {rankLabel(t, progress.level.level, theme)}
            </span>
          </div>
          <div className="mt-3">
            <XpBar
              current={progress.level.xpIntoLevel}
              total={progress.level.xpForNextLevel}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-fg-muted">
            <span>
              {t('progress.total')}{' '}
              <span className="num font-semibold text-fg">
                {history.totalXp.toLocaleString(i18n.resolvedLanguage)}
              </span>{' '}
              XP
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame
                size={16}
                aria-hidden="true"
                className={progress.streak > 0 ? 'text-primary' : 'text-fg-dim'}
              />
              <span className="num font-semibold text-fg">{progress.streak}</span>
              {progress.streak === 1 ? t('home.streakDaysOne') : t('home.streakDaysOther')}
            </span>
          </div>
        </section>

        {/* Gráfico semanal */}
        <WeeklyChart days={week} />

        {/* Próxima missão do dia */}
        <section>
          <h3 className="mb-2 flex items-baseline justify-between text-xs uppercase tracking-widest text-fg-dim">
            {t('progress.nextQuest')}
            <span className="num normal-case tracking-normal text-fg-muted">
              {t('progress.questsToday', { done: progress.questsDone, total: 3 })}
            </span>
          </h3>
          {nextQuest ? (
            <QuestCard status={nextQuest} />
          ) : (
            <p className="rounded-[14px] border border-accent bg-surface p-3 text-sm font-semibold text-accent-light">
              {uiCopy(t, 'home.questsAllDone', theme)}
            </p>
          )}
        </section>

        {/* Badges */}
        <section>
          <h3 className="mb-3 flex items-baseline justify-between text-xs uppercase tracking-widest text-fg-dim">
            {t('progress.achievements')}
            <span className="num normal-case tracking-normal text-fg-muted">
              {unlockedIds.size}/{BADGES.length}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 rounded-xl border border-line bg-surface p-4 sm:grid-cols-4">
            {BADGES.map((badge) => (
              <MedalBadge key={badge.id} badge={badge} unlocked={unlockedIds.has(badge.id)} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
