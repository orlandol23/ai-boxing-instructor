import { Play, Square, Flag, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SessionPhase } from '../../engine/SessionTracker';

interface SessionControlsProps {
  phase: SessionPhase;
  currentRound: number;
  roundElapsedMs: number;
  voiceEnabled: boolean;
  isSpeaking: boolean;
  onToggleVoice: () => void;
  onStartSession: () => void;
  onStartRound: () => void;
  onEndRound: () => void;
  onEndSession: () => void;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function SessionControls({
  phase,
  currentRound,
  roundElapsedMs,
  voiceEnabled,
  isSpeaking,
  onToggleVoice,
  onStartSession,
  onStartRound,
  onEndRound,
  onEndSession,
}: SessionControlsProps) {
  const { t } = useTranslation();

  if (phase === 'ended') return null;

  return (
    <>
      {/* Timer HUD, top-centre, .num ≥56px, legible at 2–3m (SPECS §6) */}
      {phase === 'in_round' && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-overlay px-5 py-2 text-center backdrop-blur-xs">
          <div className="num text-hud-value font-bold text-white md:text-hud-timer">
            {formatClock(roundElapsedMs)}
          </div>
          <div className="mt-1 text-xs uppercase tracking-widest text-white/70">
            {t('training.round', { number: currentRound })}
          </div>
        </div>
      )}

      {/* Round controls, footer-centre, touch targets ≥64px and a gap ≥20px */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-5">
        {phase === 'idle' && (
          <PrimaryAction onClick={onStartSession} icon={<Play size={22} aria-hidden="true" />}>
            {t('training.startTraining')}
          </PrimaryAction>
        )}

        {phase === 'between_rounds' && (
          <>
            <PrimaryAction onClick={onStartRound} icon={<Play size={22} aria-hidden="true" />}>
              {t('training.round', { number: currentRound === 0 ? 1 : currentRound + 1 })}
            </PrimaryAction>
            {currentRound > 0 && (
              <button
                type="button"
                onClick={onEndSession}
                className="tap-training flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-6 font-display text-lg font-bold uppercase tracking-wider text-fg transition-[border-color,transform] hover:border-accent active:scale-[.96]"
              >
                <Flag size={20} aria-hidden="true" />
                {t('training.finish')}
              </button>
            )}
          </>
        )}

        {phase === 'in_round' && (
          <button
            type="button"
            onClick={onEndRound}
            aria-label={t('training.endRound')}
            className="tap-training flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
          >
            <Square size={28} aria-hidden="true" />
          </button>
        )}

        <VoiceButton enabled={voiceEnabled} isSpeaking={isSpeaking} onToggle={onToggleVoice} />
      </div>
    </>
  );
}

function PrimaryAction({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-training flex items-center gap-2 rounded-xl bg-primary px-7 font-display text-lg font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
    >
      {icon}
      {children}
    </button>
  );
}

/** The coach's voice button: a 64px icon button in the controls cluster. */
function VoiceButton({
  enabled,
  isSpeaking,
  onToggle,
}: {
  enabled: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const label = enabled
    ? isSpeaking
      ? t('training.voiceSpeaking')
      : t('training.voiceOn')
    : t('training.voiceOff');
  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={enabled}
      className={`tap-training flex items-center justify-center rounded-full backdrop-blur-xs transition-[background-color,transform] active:scale-[.96] ${
        enabled
          ? 'bg-primary text-on-primary [box-shadow:var(--glow-primary)]'
          : 'bg-overlay text-white/80 hover:text-white'
      }`}
    >
      <Icon size={24} aria-hidden="true" />
    </button>
  );
}
