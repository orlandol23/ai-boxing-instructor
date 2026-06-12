import { Flame, Medal, Shield, Star, Swords, Trophy, Zap } from 'lucide-react';
import type { ComponentType } from 'react';
import type { BadgeDefinition, BadgeIcon } from '../../engine/gamification/badges';

const ICONS: Record<BadgeIcon, ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean }>> = {
  medal: Medal,
  zap: Zap,
  trophy: Trophy,
  shield: Shield,
  star: Star,
  flame: Flame,
  swords: Swords,
};

interface MedalBadgeProps {
  badge: BadgeDefinition;
  unlocked: boolean;
  /** Compacta (resumo de sessão) ou cheia, com descrição (/progress). */
  size?: 'sm' | 'md';
}

/**
 * Medal/badge (SPECS §6): círculo 76px com radial dourado e borda
 * `--accent-deep`; locked = grayscale + opacity .35. Nome sempre visível
 * (nunca só cor). Skin kids (sticker com glow) chega no F7.
 */
export function MedalBadge({ badge, unlocked, size = 'md' }: MedalBadgeProps) {
  const Icon = ICONS[badge.icon];
  const diameter = size === 'sm' ? 56 : 76;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 text-center ${
        unlocked ? '' : 'opacity-35 grayscale'
      }`}
    >
      <div
        className="flex items-center justify-center rounded-full border-2"
        style={{
          width: diameter,
          height: diameter,
          borderColor: 'var(--accent-deep)',
          background:
            'radial-gradient(circle at 35% 30%, var(--accent-light), var(--accent) 55%, var(--accent-deep))',
        }}
      >
        <Icon size={size === 'sm' ? 24 : 32} className="text-black/70" aria-hidden />
      </div>
      <span className="text-xs font-semibold leading-tight text-fg">{badge.name}</span>
      {size === 'md' && (
        <span className="text-[11px] leading-tight text-fg-muted">
          {unlocked ? badge.description : `Bloqueada — ${badge.description.toLowerCase()}`}
        </span>
      )}
    </div>
  );
}
