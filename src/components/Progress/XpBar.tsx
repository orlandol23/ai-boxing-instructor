interface XpBarProps {
  /** XP acumulado dentro do nível atual. */
  current: number;
  /** Custo total do nível atual. */
  total: number;
  /** Exibe "atual / total XP" abaixo da barra (cor nunca vem sozinha). */
  showLabel?: boolean;
}

/** XP bar (SPECS §6): track 12px `--xp-track`, fill `--xp` + glow. */
export function XpBar({ current, total, showLabel = true }: XpBarProps) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className="w-full">
      <div
        className="h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--xp-track)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label="Progresso de XP no nível"
      >
        <div
          className="h-full rounded-full bg-xp transition-[width] duration-300 [box-shadow:var(--glow-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="num mt-1 text-right text-xs text-fg-muted">
          {current.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')} XP
        </p>
      )}
    </div>
  );
}
