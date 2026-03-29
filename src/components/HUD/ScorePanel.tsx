import type { AnalysisFrame, PunchEvent, PunchType } from '../../engine/types';

interface ScorePanelProps {
  frame: AnalysisFrame | null;
  punchCount: number;
  recentPunches: PunchEvent[];
}

const PUNCH_LABELS: Record<PunchType, string> = {
  jab: 'Jab',
  cross: 'Cross',
  lead_hook: 'Lead Hook',
  rear_hook: 'Rear Hook',
  lead_uppercut: 'Lead Upper',
  rear_uppercut: 'Rear Upper',
};

export function ScorePanel({ frame, punchCount, recentPunches }: ScorePanelProps) {
  if (!frame) return null;

  const { stance, guard, base } = frame;

  return (
    <div className="absolute top-14 left-3 z-10 flex flex-col gap-2">
      {/* Stance indicator */}
      <div className="rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        {stance === 'unknown' ? '—' : stance === 'orthodox' ? 'Ortodoxa' : 'Canhota'}
      </div>

      {/* Guard score */}
      <ScoreBar label="Guarda" score={guard.overall} />

      {/* Base score */}
      <ScoreBar label="Base" score={base.overall} />

      {/* Punch counter */}
      <div className="rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        Golpes: {punchCount}
      </div>

      {/* Recent punch feed */}
      {recentPunches.length > 0 && (
        <div className="flex flex-col gap-1">
          {recentPunches.slice(-3).map((punch) => (
            <PunchBadge key={`${punch.timestamp}-${punch.type}`} punch={punch} />
          ))}
        </div>
      )}
    </div>
  );
}

function getScoreClasses(score: number): { barClass: string; textClass: string } {
  if (score >= 90) return { barClass: 'bg-score-good', textClass: 'text-score-good' };
  if (score >= 70) return { barClass: 'bg-score-warn', textClass: 'text-score-warn' };
  return { barClass: 'bg-score-bad', textClass: 'text-score-bad' };
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const { barClass, textClass } = getScoreClasses(score);

  return (
    <div className="flex items-center gap-2 rounded-md bg-black/60 px-2 py-1">
      <span className="text-xs text-gray-300 w-12">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-700 min-w-12">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-7 text-right ${textClass}`}>
        {score}
      </span>
    </div>
  );
}

function PunchBadge({ punch }: { punch: PunchEvent }) {
  const qualityColors = {
    good: 'text-score-good',
    fair: 'text-score-warn',
    poor: 'text-score-bad',
  };

  return (
    <div className="rounded-md bg-black/60 px-2 py-1 text-xs flex items-center gap-1">
      <span className="text-white font-bold">
        {PUNCH_LABELS[punch.type] ?? punch.type}
      </span>
      <span className={qualityColors[punch.quality]}>
        {punch.quality === 'good' ? '!' : punch.quality === 'fair' ? '~' : '?'}
      </span>
    </div>
  );
}
