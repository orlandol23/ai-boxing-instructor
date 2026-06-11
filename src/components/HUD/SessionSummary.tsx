import { RotateCcw, Home } from 'lucide-react';
import type { PunchType, SessionSummary as SessionSummaryData } from '../../engine/types';
import type { CoachFeedbackStatus } from '../../hooks/useCoachingFeedback';
import { CoachBubble } from './CoachBubble';

interface SessionSummaryProps {
  summary: SessionSummaryData;
  /** Estado do coach IA ('idle' oculta a seção — ex.: sessão sem rounds). */
  coachStatus?: CoachFeedbackStatus;
  coachFeedback?: string | null;
  onRestart: () => void;
  onHome: () => void;
}

const PUNCH_LABELS: Record<PunchType, string> = {
  jab: 'Jab',
  cross: 'Cross',
  lead_hook: 'Lead Hook',
  rear_hook: 'Rear Hook',
  lead_uppercut: 'Lead Upper',
  rear_uppercut: 'Rear Upper',
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-score-good';
  if (score >= 65) return 'text-score-warn';
  return 'text-score-bad';
}

export function SessionSummary({
  summary,
  coachStatus = 'idle',
  coachFeedback = null,
  onRestart,
  onHome,
}: SessionSummaryProps) {
  const punches = (Object.keys(summary.punchBreakdown) as PunchType[])
    .map((type) => ({ type, count: summary.punchBreakdown[type] }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay backdrop-blur-sm">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-5">
        <header className="text-center">
          <h2 className="font-display text-title font-extrabold uppercase tracking-wide text-fg">
            Sessão concluída
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {summary.rounds} {summary.rounds === 1 ? 'round' : 'rounds'} ·{' '}
            {formatDuration(summary.duration)} · shadow boxing
          </p>
        </header>

        {/* médias e volume — número sempre junto da cor (SPECS §2) */}
        <section className="grid grid-cols-3 gap-2.5">
          <Stat
            label="Guarda"
            value={Math.round(summary.avgGuardScore).toString()}
            valueClass={scoreColor(summary.avgGuardScore)}
          />
          <Stat
            label="Base"
            value={Math.round(summary.avgBaseScore).toString()}
            valueClass={scoreColor(summary.avgBaseScore)}
          />
          <Stat label="Golpes" value={String(summary.totalPunches)} />
        </section>

        {punches.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              Distribuição de golpes
            </h3>
            <ul className="flex flex-col gap-1">
              {punches.map(({ type, count }) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-fg">{PUNCH_LABELS[type]}</span>
                  <span className="num text-lg font-bold leading-none text-fg">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.corrections.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">
              Pontos para trabalhar
            </h3>
            <ul className="flex flex-col gap-1">
              {summary.corrections.map((c, i) => (
                <li
                  key={i}
                  className="rounded-md border-l-2 border-score-bad bg-surface-2 px-3 py-2 text-sm text-fg"
                >
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.highlights.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">Destaques</h3>
            <ul className="flex flex-col gap-1">
              {summary.highlights.map((h, i) => (
                <li
                  key={i}
                  className="rounded-md border-l-2 border-score-good bg-surface-2 px-3 py-2 text-sm text-fg"
                >
                  {h}
                </li>
              ))}
            </ul>
          </section>
        )}

        {coachStatus !== 'idle' && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-widest text-fg-dim">Coach IA</h3>
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
            Treinar de novo
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-2 font-display text-lg font-bold uppercase tracking-wider text-fg transition-[border-color,transform] hover:border-accent active:scale-[.96]"
          >
            <Home size={18} aria-hidden="true" />
            Início
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
