import { describe, expect, it } from 'vitest';
import { BADGES, badgeById, evaluateBadges, type BadgeContext } from '../badges';
import { breakdown, lifetime, record, round } from './fixtures';

function ctx(overrides: Partial<BadgeContext> = {}): BadgeContext {
  return { session: record(), lifetime: lifetime(), streakCount: 1, ...overrides };
}

function unlockedIds(context: BadgeContext): string[] {
  return evaluateBadges(context, new Set()).map((b) => b.id);
}

describe('catalogue', () => {
  it('has 8 badges with unique ids', () => {
    expect(BADGES).toHaveLength(8);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(8);
  });

  it('exposes i18n keys derived from the id, never literal copy', () => {
    // The engine is language-free: it names the phrase, it never writes it.
    for (const badge of BADGES) {
      expect(badge.nameKey).toBe(`badges.${badge.id}.name`);
      expect(badge.descriptionKey).toBe(`badges.${badge.id}.description`);
    }
  });
});

describe('individual criteria', () => {
  it('First Session: the profile\'s 1st session', () => {
    expect(unlockedIds(ctx({ lifetime: lifetime({ sessions: 1 }) }))).toContain('first_session');
  });

  it('100/1000 Punches: exact boundary on the accumulated totals', () => {
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 99 }) }))).not.toContain('punches_100');
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 100 }) }))).toContain('punches_100');
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 999 }) }))).not.toContain(
      'punches_1000'
    );
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 1000 }) }))).toContain('punches_1000');
  });

  it('Iron Guard: average guard >= 90 in the session (with a round)', () => {
    expect(unlockedIds(ctx({ session: record({ avgGuardScore: 90 }) }))).toContain('iron_guard');
    expect(unlockedIds(ctx({ session: record({ avgGuardScore: 89.9 }) }))).not.toContain(
      'iron_guard'
    );
    expect(
      unlockedIds(ctx({ session: record({ avgGuardScore: 90, rounds: 0, roundDetails: [] }) }))
    ).not.toContain('iron_guard');
  });

  it('Perfect Session: a round with guard AND base >= 90 and at least 1 punch', () => {
    const perfect = round({ avgGuardScore: 90, avgBaseScore: 90, punchCount: 5 });
    expect(unlockedIds(ctx({ session: record({ roundDetails: [perfect] }) }))).toContain(
      'perfect_session'
    );
    expect(
      unlockedIds(
        ctx({ session: record({ roundDetails: [{ ...perfect, avgBaseScore: 89 }] }) })
      )
    ).not.toContain('perfect_session');
    expect(
      unlockedIds(ctx({ session: record({ roundDetails: [{ ...perfect, punchCount: 0 }] }) }))
    ).not.toContain('perfect_session');
  });

  it('7/30 Days in a Row: exact streak boundary', () => {
    expect(unlockedIds(ctx({ streakCount: 6 }))).not.toContain('streak_7');
    expect(unlockedIds(ctx({ streakCount: 7 }))).toContain('streak_7');
    expect(unlockedIds(ctx({ streakCount: 30 }))).toEqual(
      expect.arrayContaining(['streak_7', 'streak_30'])
    );
  });

  it('Full Arsenal: all 6 punch types in the same session', () => {
    const all = breakdown({
      jab: 1,
      cross: 1,
      lead_hook: 1,
      rear_hook: 1,
      lead_uppercut: 1,
      rear_uppercut: 1,
    });
    expect(unlockedIds(ctx({ session: record({ punchBreakdown: all }) }))).toContain(
      'full_arsenal'
    );
    expect(
      unlockedIds(ctx({ session: record({ punchBreakdown: { ...all, rear_uppercut: 0 } }) }))
    ).not.toContain('full_arsenal');
  });
});

describe('evaluateBadges', () => {
  it('is permanent: an already unlocked badge never comes back', () => {
    const context = ctx();
    expect(evaluateBadges(context, new Set(['first_session'])).map((b) => b.id)).not.toContain(
      'first_session'
    );
  });

  it('can unlock several badges in the same session', () => {
    const ids = unlockedIds(
      ctx({ lifetime: lifetime({ sessions: 10, punches: 150 }), streakCount: 7 })
    );
    expect(ids).toEqual(expect.arrayContaining(['punches_100', 'streak_7']));
  });

  it('badgeById resolves persisted ids', () => {
    expect(badgeById('iron_guard')?.nameKey).toBe('badges.iron_guard.name');
    expect(badgeById('nonexistent')).toBeUndefined();
  });
});
