import { useTranslation } from 'react-i18next';
import type { WeeklyDay } from '../../engine/gamification/selectors';

function barColorClass(score: number): string {
  if (score >= 90) return 'bg-score-good';
  if (score >= 70) return 'bg-score-warn';
  return 'bg-score-bad';
}

/**
 * Weekly chart (SPECS §6): 7 bars (radius 6) with the day's average
 * score, coloured by score band and always with the number next to it; a
 * day with no training is dimmed (`--surface-2` at 8%). The week's
 * average is highlighted.
 */
export function WeeklyChart({ days }: { days: WeeklyDay[] }) {
  const { t } = useTranslation();
  const trained = days.filter((d) => d.avgScore !== null);
  const weekAvg =
    trained.length > 0
      ? Math.round(trained.reduce((s, d) => s + (d.avgScore ?? 0), 0) / trained.length)
      : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-xs uppercase tracking-widest text-fg-dim">
          {t('progress.weeklyTitle')}
        </h3>
        <span className="num text-3xl font-bold leading-none text-fg">
          {weekAvg !== null ? weekAvg : '—'}
        </span>
      </header>

      <div className="flex items-end gap-2">
        {days.map((day) => (
          <DayBar key={day.dateKey} day={day} />
        ))}
      </div>
    </div>
  );
}

function DayBar({ day }: { day: WeeklyDay }) {
  const { t } = useTranslation();
  const score = day.avgScore !== null ? Math.round(day.avgScore) : null;

  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className={`num text-xs leading-none ${score !== null ? 'text-fg' : 'text-fg-dim'}`}>
        {score !== null ? score : '·'}
      </span>
      <div className="flex h-24 w-full items-end overflow-hidden rounded-md">
        {score !== null ? (
          <div
            className={`w-full rounded-md ${barColorClass(score)}`}
            style={{ height: `${Math.max(6, score)}%` }}
          />
        ) : (
          // empty day: dimmed bar (--surface-2 at 8%)
          <div
            className="h-full w-full rounded-md"
            style={{ backgroundColor: 'color-mix(in srgb, var(--surface-2) 8%, transparent)' }}
          />
        )}
      </div>
      <span
        className={`text-[10px] uppercase tracking-wider ${
          day.isToday ? 'font-bold text-accent' : 'text-fg-dim'
        }`}
      >
        {t(day.labelKey)}
      </span>
    </div>
  );
}
