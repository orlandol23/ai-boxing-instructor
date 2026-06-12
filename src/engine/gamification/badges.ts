import type { PunchType } from '../types';
import type { LifetimeTotals, SessionRecord } from './types';

/**
 * Badges (SPECS §5): conquistas permanentes — uma vez desbloqueadas,
 * nunca saem do perfil. Avaliadas ao fim de cada sessão com o estado
 * já atualizado (lifetime/streak incluindo a sessão recém-terminada).
 */

export type BadgeId =
  | 'first_session'
  | 'punches_100'
  | 'punches_1000'
  | 'iron_guard'
  | 'perfect_session'
  | 'streak_7'
  | 'streak_30'
  | 'full_arsenal';

/** Ícones lucide usados pelo componente medal. */
export type BadgeIcon =
  | 'medal'
  | 'zap'
  | 'trophy'
  | 'shield'
  | 'star'
  | 'flame'
  | 'swords';

export interface BadgeContext {
  /** Sessão recém-concluída. */
  session: SessionRecord;
  /** Totais do perfil JÁ incluindo a sessão. */
  lifetime: LifetimeTotals;
  /** Streak (dias consecutivos) JÁ incluindo a sessão. */
  streakCount: number;
}

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: BadgeIcon;
  check(ctx: BadgeContext): boolean;
}

const ALL_PUNCH_TYPES: PunchType[] = [
  'jab',
  'cross',
  'lead_hook',
  'rear_hook',
  'lead_uppercut',
  'rear_uppercut',
];

/** Catálogo fixo — a ordem define o grid da tela de progresso. */
export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first_session',
    name: 'Primeira Sessão',
    description: 'Complete seu primeiro treino',
    icon: 'medal',
    check: (c) => c.lifetime.sessions >= 1,
  },
  {
    id: 'punches_100',
    name: '100 Golpes',
    description: 'Acumule 100 golpes no total',
    icon: 'zap',
    check: (c) => c.lifetime.punches >= 100,
  },
  {
    id: 'punches_1000',
    name: '1000 Golpes',
    description: 'Acumule 1000 golpes no total',
    icon: 'trophy',
    check: (c) => c.lifetime.punches >= 1000,
  },
  {
    id: 'iron_guard',
    name: 'Guarda de Ferro',
    description: 'Guarda média ≥ 90 numa sessão',
    icon: 'shield',
    check: (c) => c.session.rounds >= 1 && c.session.avgGuardScore >= 90,
  },
  {
    id: 'perfect_session',
    name: 'Sessão Perfeita',
    description: 'Um round com guarda e base ≥ 90',
    icon: 'star',
    check: (c) =>
      c.session.roundDetails.some(
        (r) => r.punchCount >= 1 && r.avgGuardScore >= 90 && r.avgBaseScore >= 90
      ),
  },
  {
    id: 'streak_7',
    name: '7 Dias Seguidos',
    description: 'Treine 7 dias consecutivos',
    icon: 'flame',
    check: (c) => c.streakCount >= 7,
  },
  {
    id: 'streak_30',
    name: '30 Dias Seguidos',
    description: 'Treine 30 dias consecutivos',
    icon: 'flame',
    check: (c) => c.streakCount >= 30,
  },
  {
    id: 'full_arsenal',
    name: 'Arsenal Completo',
    description: 'Acerte os 6 tipos de golpe numa mesma sessão',
    icon: 'swords',
    check: (c) => ALL_PUNCH_TYPES.every((t) => c.session.punchBreakdown[t] >= 1),
  },
];

export function badgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}

/**
 * Badges recém-desbloqueadas nesta sessão (exclui as já conquistadas —
 * permanência: nada é "des-desbloqueado" mesmo que o critério falhe hoje).
 */
export function evaluateBadges(
  ctx: BadgeContext,
  alreadyUnlocked: ReadonlySet<string>
): BadgeDefinition[] {
  return BADGES.filter((b) => !alreadyUnlocked.has(b.id) && b.check(ctx));
}
