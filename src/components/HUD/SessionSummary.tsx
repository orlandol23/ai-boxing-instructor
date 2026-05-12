import { RotateCcw, Home } from 'lucide-react';
import type { PunchType, SessionSummary as SessionSummaryData } from '../../engine/types';

interface SessionSummaryProps {
  summary: SessionSummaryData;
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

export function SessionSummary({ summary, onRestart, onHome }: SessionSummaryProps) {
  const punches = (Object.keys(summary.punchBreakdown) as PunchType[])
    .map((type) => ({ type, count: summary.punchBreakdown[type] }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-boxing-border bg-boxing-card p-5">
        <header className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-gray-400">Treino finalizado</span>
          <h2 className="font-display text-2xl font-bold text-boxing-gold">Resumo</h2>
        </header>

        <section className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Duração" value={formatDuration(summary.duration)} />
          <Stat label="Rounds" value={String(summary.rounds)} />
          <Stat label="Golpes" value={String(summary.totalPunches)} />
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Stat
            label="Guarda média"
            value={Math.round(summary.avgGuardScore).toString()}
            valueClass={scoreColor(summary.avgGuardScore)}
          />
          <Stat
            label="Base média"
            value={Math.round(summary.avgBaseScore).toString()}
            valueClass={scoreColor(summary.avgBaseScore)}
          />
        </section>

        {punches.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-400">Distribuição de golpes</h3>
            <ul className="flex flex-col gap-1">
              {punches.map(({ type, count }) => (
                <li key={type} className="flex items-center justify-between rounded-md bg-black/40 px-3 py-1.5 text-sm">
                  <span className="text-gray-200">{PUNCH_LABELS[type]}</span>
                  <span className="font-mono font-bold text-white">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.corrections.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-400">Pontos para trabalhar</h3>
            <ul className="flex flex-col gap-1">
              {summary.corrections.map((c, i) => (
                <li key={i} className="rounded-md bg-score-bad/15 px-3 py-1.5 text-sm text-gray-100">
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.highlights.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-400">Destaques</h3>
            <ul className="flex flex-col gap-1">
              {summary.highlights.map((h, i) => (
                <li key={i} className="rounded-md bg-score-good/15 px-3 py-1.5 text-sm text-gray-100">
                  {h}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-boxing-red py-3 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-boxing-red-light"
          >
            <RotateCcw size={16} />
            Novo treino
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black/60 py-3 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-black/80"
          >
            <Home size={16} />
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
    <div className="flex flex-col rounded-md bg-black/40 px-2 py-2">
      <span className="text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`font-mono text-lg font-bold ${valueClass ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
