import type { AnalysisFrame, PunchEvent, PunchType } from '../../engine/types';
import { xpForPunch } from '../../engine/gamification/xp';

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
    <>
      {/* Contador de golpes + postura — canto sup. esquerdo */}
      <div className="absolute left-3 top-20 z-10 rounded-md bg-overlay px-3.5 py-2 text-center backdrop-blur-xs">
        <div className="num text-4xl font-bold leading-none text-white">{punchCount}</div>
        <div className="mt-0.5 text-xs uppercase tracking-widest text-white/70">golpes</div>
        <div className="mt-0.5 text-xs text-white/50">
          {stance === 'unknown' ? '—' : stance === 'orthodox' ? 'Ortodoxa' : 'Canhota'}
        </div>
      </div>

      {/* Punch feed — lado direito; novo golpe maior, decai escala/opacidade */}
      {recentPunches.length > 0 && (
        <div className="absolute right-3 top-20 z-10 flex flex-col items-end gap-1.5">
          {recentPunches
            .slice(-3)
            .reverse()
            .map((punch, i) => (
              <PunchBadge key={`${punch.timestamp}-${punch.type}`} punch={punch} rank={i} />
            ))}
        </div>
      )}

      {/* ScoreBars — acima dos controles de round */}
      <div className="absolute inset-x-3 bottom-28 z-10 flex flex-col gap-2">
        <ScoreBar label="Guarda" score={guard.overall} />
        <ScoreBar label="Base" score={base.overall} />
      </div>
    </>
  );
}

function getScoreClasses(score: number): { barClass: string; textClass: string } {
  if (score >= 90) return { barClass: 'bg-score-good', textClass: 'text-score-good' };
  if (score >= 70) return { barClass: 'bg-score-warn', textClass: 'text-score-warn' };
  return { barClass: 'bg-score-bad', textClass: 'text-score-bad' };
}

/** ScoreBar v2 (SPECS §6): pill overlay+blur, label 14px, track 8px, valor .num 22px. */
function ScoreBar({ label, score }: { label: string; score: number }) {
  const { barClass, textClass } = getScoreClasses(score);

  return (
    <div className="flex items-center gap-2.5 rounded-[12px] bg-overlay px-3 py-2 backdrop-blur-xs">
      <span className="w-16 text-sm font-semibold uppercase tracking-wider text-white/70">
        {label}
      </span>
      <div className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`num w-11 text-right text-[22px] font-bold leading-none ${textClass}`}>
        {score}
      </span>
    </div>
  );
}

const QUALITY_TEXT = {
  good: { label: 'Bom', className: 'text-score-good' },
  fair: { label: 'Ok', className: 'text-score-warn' },
  poor: { label: 'Fraco', className: 'text-score-bad' },
} as const;

/* decaimento do feed: mais novo em destaque (SPECS §6 — punch feed) */
const RANK_STYLES = [
  'px-3 py-1.5 text-lg opacity-100',
  'px-2.5 py-1 text-base opacity-70',
  'px-2.5 py-1 text-sm opacity-40',
] as const;

function PunchBadge({ punch, rank }: { punch: PunchEvent; rank: number }) {
  const quality = QUALITY_TEXT[punch.quality];
  const rankStyle = RANK_STYLES[Math.min(rank, RANK_STYLES.length - 1)];

  return (
    <div className={`flex items-center gap-2 rounded-md bg-overlay backdrop-blur-xs ${rankStyle}`}>
      <span className="font-display font-bold uppercase leading-none text-white">
        {PUNCH_LABELS[punch.type] ?? punch.type}
      </span>
      <span className={`num font-bold leading-none ${quality.className}`}>{quality.label}</span>
      {/* +XP do golpe (SPECS §6 — punch feed) */}
      <span className="num font-bold leading-none text-xp">+{xpForPunch(punch.quality)}</span>
    </div>
  );
}
