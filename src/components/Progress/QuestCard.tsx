import { Check, Target } from 'lucide-react';
import type { QuestStatus } from '../../engine/gamification/quests';
import { questDescription, useCopy } from '../../theme/copy';

/**
 * Quest card (SPECS §6): dashed `--border-strong` border, radius 14;
 * done = solid `--accent` border + a check on an `--xp` background.
 * Progress always carries a number (x/target), never colour alone. The
 * description comes from the per-theme copy dictionary (RPG skin in the
 * kids theme, SPECS §8.3).
 */
export function QuestCard({ status }: { status: QuestStatus }) {
  const { t, theme } = useCopy();
  const { quest, progress, done } = status;

  return (
    <div
      className={`flex items-center gap-3 rounded-[14px] border bg-surface p-3 ${
        done ? 'border-solid border-accent' : 'border-dashed border-line-strong'
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-xp text-black' : 'border border-line-strong text-fg-dim'
        }`}
        aria-hidden="true"
      >
        {done ? <Check size={18} /> : <Target size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">
          {questDescription(t, quest, theme)}
        </p>
        <p className="num text-xs text-fg-muted">
          {progress}/{quest.target}
          {done ? ` · ${t('quest.done')}` : ''}
        </p>
      </div>
      <span className="num shrink-0 text-lg font-bold leading-none text-xp">
        {t('quest.xp', { xp: quest.xp })}
      </span>
    </div>
  );
}
