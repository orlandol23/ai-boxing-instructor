import { Flame, Medal, Shield, Star, Swords, Trophy, Zap } from 'lucide-react';
import type { ComponentType } from 'react';
import type { BadgeDefinition, BadgeIcon } from '../../engine/gamification/badges';
import { useAppTheme } from '../../contexts/ProfileContext';
import { badgeName } from '../../theme/copy';

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
 * Medal/badge (SPECS §6): nome sempre visível (nunca só cor); locked =
 * grayscale + opacity .35. A skin vem da classe `.medal-coin`
 * (globals.css), 100% por tokens: círculo metálico dourado no adulto;
 * sticker (radius 24, glow, rotate −3°) no kids. O nome usa o
 * dicionário de copy por tema.
 */
export function MedalBadge({ badge, unlocked, size = 'md' }: MedalBadgeProps) {
  const theme = useAppTheme();
  const Icon = ICONS[badge.icon];
  const diameter = size === 'sm' ? 56 : 76;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 text-center ${
        unlocked ? '' : 'opacity-35 grayscale'
      }`}
    >
      <div
        className="medal-coin flex items-center justify-center"
        style={{ width: diameter, height: diameter }}
      >
        <Icon size={size === 'sm' ? 24 : 32} className="text-black/70" aria-hidden />
      </div>
      <span className="text-xs font-semibold leading-tight text-fg">
        {badgeName(badge, theme)}
      </span>
      {size === 'md' && (
        <span className="text-[11px] leading-tight text-fg-muted">
          {unlocked ? badge.description : `Bloqueada — ${badge.description.toLowerCase()}`}
        </span>
      )}
    </div>
  );
}
