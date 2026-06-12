import { Check, Target } from 'lucide-react';
import type { QuestStatus } from '../../engine/gamification/quests';
import { useAppTheme } from '../../contexts/ProfileContext';
import { questDescription } from '../../theme/copy';

/**
 * Quest card (SPECS §6): borda dashed `--border-strong`, radius 14;
 * concluída = borda sólida `--accent` + check com fundo `--xp`.
 * Progresso sempre com número (x/alvo), nunca só cor. A descrição vem
 * do dicionário de copy por tema (skin RPG no kids — SPECS §8.3).
 */
export function QuestCard({ status }: { status: QuestStatus }) {
  const theme = useAppTheme();
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
          {questDescription(quest, theme)}
        </p>
        <p className="num text-xs text-fg-muted">
          {progress}/{quest.target}
          {done ? ' · concluída' : ''}
        </p>
      </div>
      <span className="num shrink-0 text-lg font-bold leading-none text-xp">
        +{quest.xp} XP
      </span>
    </div>
  );
}
