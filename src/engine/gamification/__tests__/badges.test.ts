import { describe, expect, it } from 'vitest';
import { BADGES, badgeById, evaluateBadges, type BadgeContext } from '../badges';
import { breakdown, lifetime, record, round } from './fixtures';

function ctx(overrides: Partial<BadgeContext> = {}): BadgeContext {
  return { session: record(), lifetime: lifetime(), streakCount: 1, ...overrides };
}

function unlockedIds(context: BadgeContext): string[] {
  return evaluateBadges(context, new Set()).map((b) => b.id);
}

describe('catálogo', () => {
  it('tem 8 badges com ids únicos', () => {
    expect(BADGES).toHaveLength(8);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(8);
  });

  it('expõe chaves de i18n derivadas do id — nunca copy literal', () => {
    // O motor é language-free: só nomeia a frase, não a escreve.
    for (const badge of BADGES) {
      expect(badge.nameKey).toBe(`badges.${badge.id}.name`);
      expect(badge.descriptionKey).toBe(`badges.${badge.id}.description`);
    }
  });
});

describe('critérios individuais', () => {
  it('Primeira Sessão: 1ª sessão do perfil', () => {
    expect(unlockedIds(ctx({ lifetime: lifetime({ sessions: 1 }) }))).toContain('first_session');
  });

  it('100/1000 Golpes: fronteira exata nos totais acumulados', () => {
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 99 }) }))).not.toContain('punches_100');
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 100 }) }))).toContain('punches_100');
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 999 }) }))).not.toContain(
      'punches_1000'
    );
    expect(unlockedIds(ctx({ lifetime: lifetime({ punches: 1000 }) }))).toContain('punches_1000');
  });

  it('Guarda de Ferro: guarda média ≥ 90 na sessão (com round)', () => {
    expect(unlockedIds(ctx({ session: record({ avgGuardScore: 90 }) }))).toContain('iron_guard');
    expect(unlockedIds(ctx({ session: record({ avgGuardScore: 89.9 }) }))).not.toContain(
      'iron_guard'
    );
    expect(
      unlockedIds(ctx({ session: record({ avgGuardScore: 90, rounds: 0, roundDetails: [] }) }))
    ).not.toContain('iron_guard');
  });

  it('Sessão Perfeita: um round com guarda E base ≥ 90 e ao menos 1 golpe', () => {
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

  it('7/30 Dias Seguidos: fronteira exata da streak', () => {
    expect(unlockedIds(ctx({ streakCount: 6 }))).not.toContain('streak_7');
    expect(unlockedIds(ctx({ streakCount: 7 }))).toContain('streak_7');
    expect(unlockedIds(ctx({ streakCount: 30 }))).toEqual(
      expect.arrayContaining(['streak_7', 'streak_30'])
    );
  });

  it('Arsenal Completo: os 6 tipos de golpe na mesma sessão', () => {
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
  it('é permanente: badge já desbloqueada nunca volta', () => {
    const context = ctx();
    expect(evaluateBadges(context, new Set(['first_session'])).map((b) => b.id)).not.toContain(
      'first_session'
    );
  });

  it('pode desbloquear várias badges na mesma sessão', () => {
    const ids = unlockedIds(
      ctx({ lifetime: lifetime({ sessions: 10, punches: 150 }), streakCount: 7 })
    );
    expect(ids).toEqual(expect.arrayContaining(['punches_100', 'streak_7']));
  });

  it('badgeById resolve ids persistidos', () => {
    expect(badgeById('iron_guard')?.nameKey).toBe('badges.iron_guard.name');
    expect(badgeById('inexistente')).toBeUndefined();
  });
});
