import { Star } from 'lucide-react';

/** LVL chip (SPECS §6): pill with an `--accent` border and `--accent-light` text. */
export function LevelChip({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent px-3 py-1 font-display text-sm font-bold uppercase tracking-wider text-accent-light">
      <Star size={14} aria-hidden="true" className="fill-current" />
      <span className="num">LVL {level}</span>
    </span>
  );
}
