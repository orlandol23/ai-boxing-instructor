import { useTranslation } from 'react-i18next';
import type { AnalysisFrame, PunchEvent } from '../../engine/types';
import { xpForPunch } from '../../engine/gamification/xp';

interface ScorePanelProps {
  frame: AnalysisFrame | null;
  punchCount: number;
  recentPunches: PunchEvent[];
}

export function ScorePanel({ frame, punchCount, recentPunches }: ScorePanelProps) {
  const { t } = useTranslation();

  if (!frame) return null;

  const { stance, guard, base } = frame;

  return (
    <>
      {/* Punch counter + stance, top-left corner */}
      <div className="absolute left-3 top-20 z-10 rounded-md bg-overlay px-3.5 py-2 text-center backdrop-blur-xs">
        <div className="num text-4xl font-bold leading-none text-white">{punchCount}</div>
        <div className="mt-0.5 text-xs uppercase tracking-widest text-white/70">
          {t('training.punches')}
        </div>
        <div className="mt-0.5 text-xs text-white/50">
          {stance === 'unknown' ? '—' : t(`stance.${stance}`)}
        </div>
      </div>

      {/* Punch feed, right-hand side; a new punch is bigger, then scale/opacity decay */}
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

      {/* ScoreBars, above the round controls */}
      <div className="absolute inset-x-3 bottom-28 z-10 flex flex-col gap-2">
        <ScoreBar label={t('training.guard')} score={guard.overall} />
        <ScoreBar label={t('training.base')} score={base.overall} />
      </div>
    </>
  );
}

function getScoreClasses(score: number): { barClass: string; textClass: string } {
  if (score >= 90) return { barClass: 'bg-score-good', textClass: 'text-score-good' };
  if (score >= 70) return { barClass: 'bg-score-warn', textClass: 'text-score-warn' };
  return { barClass: 'bg-score-bad', textClass: 'text-score-bad' };
}

/** ScoreBar v2 (SPECS §6): overlay+blur pill, 14px label, 8px track, 22px .num value. */
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

const QUALITY_CLASSES = {
  good: 'text-score-good',
  fair: 'text-score-warn',
  poor: 'text-score-bad',
} as const;

/* feed decay: the newest one stands out (SPECS §6, punch feed) */
const RANK_STYLES = [
  'px-3 py-1.5 text-lg opacity-100',
  'px-2.5 py-1 text-base opacity-70',
  'px-2.5 py-1 text-sm opacity-40',
] as const;

function PunchBadge({ punch, rank }: { punch: PunchEvent; rank: number }) {
  const { t } = useTranslation();
  const rankStyle = RANK_STYLES[Math.min(rank, RANK_STYLES.length - 1)];

  return (
    <div className={`flex items-center gap-2 rounded-md bg-overlay backdrop-blur-xs ${rankStyle}`}>
      <span className="font-display font-bold uppercase leading-none text-white">
        {t(`punchType.${punch.type}`)}
      </span>
      <span className={`num font-bold leading-none ${QUALITY_CLASSES[punch.quality]}`}>
        {t(`quality.${punch.quality}`)}
      </span>
      {/* the punch's +XP (SPECS §6, punch feed) */}
      <span className="num font-bold leading-none text-xp">+{xpForPunch(punch.quality)}</span>
    </div>
  );
}
