import { Flame, Medal, Shield, Star, Swords, Trophy, Zap } from 'lucide-react';
import type { ComponentType } from 'react';
import type { BadgeDefinition, BadgeIcon } from '../../engine/gamification/badges';
import { badgeDescription, badgeName, useCopy } from '../../theme/copy';

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
  /** Compact (session summary) or full, with a description (/progress). */
  size?: 'sm' | 'md';
}

/**
 * Medal/badge (SPECS §6): the name is always visible (never colour
 * alone); locked = grayscale + opacity .35. The skin comes from the
 * `.medal-coin` class (globals.css), 100% through tokens: a gold metallic
 * circle in the adult theme; a sticker (radius 24, glow, rotate −3°) in
 * the kids theme. The name comes from the per-theme copy dictionary.
 */
export function MedalBadge({ badge, unlocked, size = 'md' }: MedalBadgeProps) {
  const { t, theme } = useCopy();
  const description = badgeDescription(t, badge);
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
        {badgeName(t, badge, theme)}
      </span>
      {size === 'md' && (
        <span className="text-[11px] leading-tight text-fg-muted">
          {unlocked
            ? description
            : t('badges.locked', { description: description.toLowerCase() })}
        </span>
      )}
    </div>
  );
}
