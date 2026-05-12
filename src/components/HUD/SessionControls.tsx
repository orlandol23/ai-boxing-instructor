import { Play, Square, Flag } from 'lucide-react';
import type { SessionPhase } from '../../engine/SessionTracker';

interface SessionControlsProps {
  phase: SessionPhase;
  currentRound: number;
  roundElapsedMs: number;
  onStartSession: () => void;
  onStartRound: () => void;
  onEndRound: () => void;
  onEndSession: () => void;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionControls({
  phase,
  currentRound,
  roundElapsedMs,
  onStartSession,
  onStartRound,
  onEndRound,
  onEndSession,
}: SessionControlsProps) {
  if (phase === 'ended') return null;

  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      {phase === 'in_round' && (
        <div className="flex items-center gap-3 rounded-md bg-black/70 px-3 py-1.5 text-white">
          <span className="text-xs uppercase tracking-wider text-gray-300">
            Round {currentRound}
          </span>
          <span className="font-mono text-base font-bold">
            {formatClock(roundElapsedMs)}
          </span>
        </div>
      )}

      {phase === 'idle' && (
        <button
          type="button"
          onClick={onStartSession}
          className="flex items-center gap-2 rounded-lg bg-boxing-red px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-boxing-red-light"
        >
          <Play size={18} />
          Iniciar treino
        </button>
      )}

      {phase === 'between_rounds' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartRound}
            className="flex items-center gap-2 rounded-lg bg-boxing-red px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-boxing-red-light"
          >
            <Play size={16} />
            {currentRound === 0 ? 'Iniciar round 1' : `Iniciar round ${currentRound + 1}`}
          </button>
          {currentRound > 0 && (
            <button
              type="button"
              onClick={onEndSession}
              className="flex items-center gap-2 rounded-lg bg-black/70 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-black/85"
            >
              <Flag size={16} />
              Finalizar treino
            </button>
          )}
        </div>
      )}

      {phase === 'in_round' && (
        <button
          type="button"
          onClick={onEndRound}
          className="flex items-center gap-2 rounded-lg bg-black/70 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-black/85"
        >
          <Square size={16} />
          Encerrar round
        </button>
      )}
    </div>
  );
}
