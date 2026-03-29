interface VoiceToggleProps {
  enabled: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
}

export function VoiceToggle({ enabled, isSpeaking, onToggle }: VoiceToggleProps) {
  const label = enabled
    ? isSpeaking
      ? 'Coach de voz ativo, falando'
      : 'Coach de voz ativo'
    : 'Coach de voz desativado';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute top-14 right-3 z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        enabled
          ? 'bg-boxing-red text-white'
          : 'bg-black/60 text-gray-300 hover:text-white'
      }`}
      aria-label={label}
      aria-pressed={enabled}
    >
      <span className="text-sm" aria-hidden="true">
        {enabled ? (isSpeaking ? '\u{1F50A}' : '\u{1F508}') : '\u{1F507}'}
      </span>
      <span>Coach</span>
    </button>
  );
}
