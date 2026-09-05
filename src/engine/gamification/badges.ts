import type { PunchType } from '../types';
import type { LifetimeTotals, SessionRecord } from './types';

/**
 * Badges (SPECS §5): permanent achievements. Once unlocked, they never
 * leave the profile. Evaluated at the end of every session against the
 * already updated state (lifetime/streak including the session that has
 * just finished).
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

/** The lucide icons the medal component uses. */
export type BadgeIcon =
  | 'medal'
  | 'zap'
  | 'trophy'
  | 'shield'
  | 'star'
  | 'flame'
  | 'swords';

export interface BadgeContext {
  /** The session that has just finished. */
  session: SessionRecord;
  /** The profile's totals, ALREADY including the session. */
  lifetime: LifetimeTotals;
  /** Streak (consecutive days), ALREADY including the session. */
  streakCount: number;
}

export interface BadgeDefinition {
  id: BadgeId;
  /**
   * i18n key of the badge name. The `_kids` variant of the same key holds
   * the Arcade Royale skin; where the RPG metaphor adds nothing (neutral
   * counters like "100 Punches") the locale simply omits it and the base
   * key is used for both themes.
   */
  nameKey: string;
  /** i18n key of the unlock criterion. Never themed — precision > skin. */
  descriptionKey: string;
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

/**
 * Fixed catalogue: the order defines the grid on the progress screen.
 * Copy lives in `src/i18n/locales/*` under `badges.<id>.*`; the engine
 * only owns the ids, the criteria and the icon.
 */
export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first_session',
    nameKey: 'badges.first_session.name',
    descriptionKey: 'badges.first_session.description',
    icon: 'medal',
    check: (c) => c.lifetime.sessions >= 1,
  },
  {
    id: 'punches_100',
    nameKey: 'badges.punches_100.name',
    descriptionKey: 'badges.punches_100.description',
    icon: 'zap',
    check: (c) => c.lifetime.punches >= 100,
  },
  {
    id: 'punches_1000',
    nameKey: 'badges.punches_1000.name',
    descriptionKey: 'badges.punches_1000.description',
    icon: 'trophy',
    check: (c) => c.lifetime.punches >= 1000,
  },
  {
    id: 'iron_guard',
    nameKey: 'badges.iron_guard.name',
    descriptionKey: 'badges.iron_guard.description',
    icon: 'shield',
    check: (c) => c.session.rounds >= 1 && c.session.avgGuardScore >= 90,
  },
  {
    id: 'perfect_session',
    nameKey: 'badges.perfect_session.name',
    descriptionKey: 'badges.perfect_session.description',
    icon: 'star',
    check: (c) =>
      c.session.roundDetails.some(
        (r) => r.punchCount >= 1 && r.avgGuardScore >= 90 && r.avgBaseScore >= 90
      ),
  },
  {
    id: 'streak_7',
    nameKey: 'badges.streak_7.name',
    descriptionKey: 'badges.streak_7.description',
    icon: 'flame',
    check: (c) => c.streakCount >= 7,
  },
  {
    id: 'streak_30',
    nameKey: 'badges.streak_30.name',
    descriptionKey: 'badges.streak_30.description',
    icon: 'flame',
    check: (c) => c.streakCount >= 30,
  },
  {
    id: 'full_arsenal',
    nameKey: 'badges.full_arsenal.name',
    descriptionKey: 'badges.full_arsenal.description',
    icon: 'swords',
    check: (c) => ALL_PUNCH_TYPES.every((t) => c.session.punchBreakdown[t] >= 1),
  },
];

export function badgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}

/**
 * Badges newly unlocked in this session (the ones already earned are
 * excluded; permanence means nothing is "un-unlocked" even if the
 * criterion fails today).
 */
export function evaluateBadges(
  ctx: BadgeContext,
  alreadyUnlocked: ReadonlySet<string>
): BadgeDefinition[] {
  return BADGES.filter((b) => !alreadyUnlocked.has(b.id) && b.check(ctx));
}
