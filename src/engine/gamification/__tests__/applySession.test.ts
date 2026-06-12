import { describe, expect, it } from 'vitest';
import { applySession } from '../applySession';
import { localDateKey } from '../streak';
import { MAX_STORED_SESSIONS, emptyHistory } from '../types';
import { breakdown, quality, qualityByType, round, summary } from './fixtures';

/** 10h local de 2026-06-11 — determinístico em qualquer fuso. */
const NOW = new Date(2026, 5, 11, 10, 0, 0).getTime();
const TODAY = localDateKey(NOW);
const TOMORROW_NOW = new Date(2026, 5, 12, 10, 0, 0).getTime();

describe('applySession', () => {
  it('credita XP de golpes + bônus de round e registra a sessão', () => {
    const s = summary({
      punchQuality: quality(5, 2, 1), // 50 + 10 + 2 = 62
      roundDetails: [round({ avgGuardScore: 85, avgBaseScore: 85 })], // +50
    });
    const { history, gains } = applySession(emptyHistory(), s, { now: NOW });

    expect(gains.xp.punchXp).toBe(62);
    expect(gains.xp.roundBonusXp).toBe(50);
    expect(gains.totalSessionXp).toBe(112 + gains.questXp);
    expect(gains.record.xpGained).toBe(gains.totalSessionXp);
    expect(gains.record.dateKey).toBe(TODAY);
    expect(history.totalXp).toBe(gains.totalSessionXp);
    expect(history.sessions).toHaveLength(1);
    expect(history.lifetime).toEqual({ sessions: 1, rounds: 1, punches: 10, goodPunches: 5 });
  });

  it('não muta o histórico de entrada', () => {
    const before = emptyHistory();
    const snapshot = JSON.parse(JSON.stringify(before));
    applySession(before, summary(), { now: NOW });
    expect(before).toEqual(snapshot);
  });

  it('acumula o agregado diário entre sessões do mesmo dia', () => {
    const s = summary({ totalPunches: 10, punchQuality: quality(10) });
    const first = applySession(emptyHistory(), s, { now: NOW });
    const second = applySession(first.history, s, { now: NOW + 60_000 });

    const day = second.history.dailyAggregates[TODAY];
    expect(day.sessions).toBe(2);
    expect(day.totalPunches).toBe(20);
    expect(day.goodPunches).toBe(20);
    expect(day.rounds).toBe(2);
    expect(day.xpGained).toBe(second.history.totalXp);
  });

  it('avança a streak em dias consecutivos e reinicia após lacuna', () => {
    const a = applySession(emptyHistory(), summary(), { now: NOW });
    expect(a.gains.streakCount).toBe(1);
    const b = applySession(a.history, summary(), { now: TOMORROW_NOW });
    expect(b.gains.streakCount).toBe(2);
    const c = applySession(b.history, summary(), {
      now: new Date(2026, 5, 20, 10, 0).getTime(),
    });
    expect(c.gains.streakCount).toBe(1);
  });

  it('desbloqueia badges uma única vez (Primeira Sessão)', () => {
    const first = applySession(emptyHistory(), summary(), { now: NOW });
    expect(first.gains.newBadges.map((b) => b.id)).toContain('first_session');
    const second = applySession(first.history, summary(), { now: NOW + 60_000 });
    expect(second.gains.newBadges.map((b) => b.id)).not.toContain('first_session');
    expect(
      second.history.unlockedBadges.filter((b) => b.id === 'first_session')
    ).toHaveLength(1);
  });

  it('não paga XP de missão duas vezes no mesmo dia', () => {
    // Sessão "monstro" que completa qualquer missão do pool de uma vez.
    const monster = summary({
      rounds: 5,
      totalPunches: 600,
      punchBreakdown: breakdown({
        jab: 100,
        cross: 100,
        lead_hook: 100,
        rear_hook: 100,
        lead_uppercut: 100,
        rear_uppercut: 100,
      }),
      punchQuality: quality(600),
      punchQualityByType: qualityByType({
        jab: quality(100),
        cross: quality(100),
        lead_hook: quality(100),
        rear_hook: quality(100),
        lead_uppercut: quality(100),
        rear_uppercut: quality(100),
      }),
      roundDetails: Array.from({ length: 5 }, (_, i) =>
        round({ number: i + 1, avgGuardScore: 95, avgBaseScore: 95, punchCount: 120 })
      ),
      avgGuardScore: 95,
      avgBaseScore: 95,
    });

    const first = applySession(emptyHistory(), monster, { now: NOW });
    expect(first.gains.completedQuests).toHaveLength(3);
    expect(first.gains.questXp).toBe(
      first.gains.completedQuests.reduce((s, q) => s + q.quest.xp, 0)
    );
    expect(first.history.completedQuests[TODAY]).toHaveLength(3);

    const second = applySession(first.history, monster, { now: NOW + 60_000 });
    expect(second.gains.completedQuests).toHaveLength(0);
    expect(second.gains.questXp).toBe(0);
    expect(second.history.completedQuests[TODAY]).toHaveLength(3);
  });

  it('detecta level-up com fronteira exata de XP', () => {
    // 25 golpes good = 250 XP ≥ custo do nível 1, sem bônus de round.
    const s = summary({
      totalPunches: 25,
      punchQuality: quality(25),
      punchQualityByType: qualityByType({ jab: quality(25) }),
      punchBreakdown: breakdown({ jab: 25 }),
      roundDetails: [round({ avgGuardScore: 50, avgBaseScore: 50, punchCount: 25 })],
      avgGuardScore: 50,
      avgBaseScore: 50,
    });
    const { gains } = applySession(emptyHistory(), s, { now: NOW });
    expect(gains.xp.total).toBe(250);
    // totalSessionXp = 250 + XP de missões (≥ 0) → sempre cruza o nível 1.
    expect(gains.leveledUp).toBe(true);
    expect(gains.levelBefore.level).toBe(1);
    expect(gains.levelAfter.level).toBeGreaterThanOrEqual(2);
  });

  it('anexa coachFeedback e respeita sessionId explícito', () => {
    const { history } = applySession(emptyHistory(), summary(), {
      now: NOW,
      sessionId: 'sessao-1',
      coachFeedback: 'Bom jab, mantenha a guarda.',
    });
    expect(history.sessions[0].id).toBe('sessao-1');
    expect(history.sessions[0].coachFeedback).toBe('Bom jab, mantenha a guarda.');
  });

  it('limita o número de sessões detalhadas armazenadas', () => {
    let history = emptyHistory();
    for (let i = 0; i < MAX_STORED_SESSIONS + 5; i++) {
      history = applySession(history, summary(), { now: NOW + i * 1000 }).history;
    }
    expect(history.sessions).toHaveLength(MAX_STORED_SESSIONS);
    expect(history.lifetime.sessions).toBe(MAX_STORED_SESSIONS + 5);
  });
});
