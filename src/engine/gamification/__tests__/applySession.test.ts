import { describe, expect, it } from 'vitest';
import { applySession } from '../applySession';
import { localDateKey } from '../streak';
import { MAX_STORED_SESSIONS, emptyHistory } from '../types';
import { breakdown, quality, qualityByType, round, summary } from './fixtures';

/** 10:00 local on 2026-06-11, deterministic in any time zone. */
const NOW = new Date(2026, 5, 11, 10, 0, 0).getTime();
const TODAY = localDateKey(NOW);
const TOMORROW_NOW = new Date(2026, 5, 12, 10, 0, 0).getTime();

describe('applySession', () => {
  it('credits punch XP + round bonus and records the session', () => {
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

  it('does not mutate the input history', () => {
    const before = emptyHistory();
    const snapshot = JSON.parse(JSON.stringify(before));
    applySession(before, summary(), { now: NOW });
    expect(before).toEqual(snapshot);
  });

  it('accumulates the daily aggregate across sessions on the same day', () => {
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

  it('advances the streak on consecutive days and restarts after a gap', () => {
    const a = applySession(emptyHistory(), summary(), { now: NOW });
    expect(a.gains.streakCount).toBe(1);
    const b = applySession(a.history, summary(), { now: TOMORROW_NOW });
    expect(b.gains.streakCount).toBe(2);
    const c = applySession(b.history, summary(), {
      now: new Date(2026, 5, 20, 10, 0).getTime(),
    });
    expect(c.gains.streakCount).toBe(1);
  });

  it('unlocks a badge only once (First Session)', () => {
    const first = applySession(emptyHistory(), summary(), { now: NOW });
    expect(first.gains.newBadges.map((b) => b.id)).toContain('first_session');
    const second = applySession(first.history, summary(), { now: NOW + 60_000 });
    expect(second.gains.newBadges.map((b) => b.id)).not.toContain('first_session');
    expect(
      second.history.unlockedBadges.filter((b) => b.id === 'first_session')
    ).toHaveLength(1);
  });

  it('never pays quest XP twice on the same day', () => {
    // A "monster" session that completes any quest in the pool at once.
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

  it('detects a level-up on the exact XP boundary', () => {
    // 25 good punches = 250 XP >= the cost of level 1, with no round bonus.
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
    // totalSessionXp = 250 + quest XP (>= 0), so it always crosses level 1.
    expect(gains.leveledUp).toBe(true);
    expect(gains.levelBefore.level).toBe(1);
    expect(gains.levelAfter.level).toBeGreaterThanOrEqual(2);
  });

  it('attaches coachFeedback and honours an explicit sessionId', () => {
    const { history } = applySession(emptyHistory(), summary(), {
      now: NOW,
      sessionId: 'session-1',
      coachFeedback: 'Good jab, keep your guard up.',
    });
    expect(history.sessions[0].id).toBe('session-1');
    expect(history.sessions[0].coachFeedback).toBe('Good jab, keep your guard up.');
  });

  it('caps the number of detailed sessions kept', () => {
    let history = emptyHistory();
    for (let i = 0; i < MAX_STORED_SESSIONS + 5; i++) {
      history = applySession(history, summary(), { now: NOW + i * 1000 }).history;
    }
    expect(history.sessions).toHaveLength(MAX_STORED_SESSIONS);
    expect(history.lifetime.sessions).toBe(MAX_STORED_SESSIONS + 5);
  });
});
