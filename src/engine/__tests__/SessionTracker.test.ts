import { beforeEach, describe, expect, it } from 'vitest';
import {
  CORRECTION_NOTE_KEYS,
  GENERIC_CORRECTION_NOTE_KEY,
  GOOD_PUNCHES_NOTE_KEY,
  HIGH_SCORE_STREAK_NOTE_KEY,
  SessionTracker,
} from '../SessionTracker';
import { COACHING_PHRASE_KEYS } from '../CoachingRules';
import { makeBase, makeFrame, makeGuard, makePunch } from './fixtures';

describe('SessionTracker', () => {
  let tracker: SessionTracker;

  beforeEach(() => {
    tracker = new SessionTracker();
  });

  describe('lifecycle', () => {
    it('starts idle with no rounds', () => {
      expect(tracker.getPhase()).toBe('idle');
      expect(tracker.getCurrentRoundNumber()).toBe(0);
    });

    it('moves to between_rounds when the session starts', () => {
      tracker.startSession(1000);
      expect(tracker.getPhase()).toBe('between_rounds');
    });

    it('moves to in_round and numbers rounds sequentially', () => {
      tracker.startSession(1000);
      tracker.startRound(2000);
      expect(tracker.getPhase()).toBe('in_round');
      expect(tracker.getCurrentRoundNumber()).toBe(1);

      tracker.endRound(3000);
      expect(tracker.getPhase()).toBe('between_rounds');

      tracker.startRound(4000);
      expect(tracker.getCurrentRoundNumber()).toBe(2);
    });

    it('auto-starts the session when startRound is called while idle', () => {
      tracker.startRound(1000);
      expect(tracker.getPhase()).toBe('in_round');
      expect(tracker.getCurrentRoundNumber()).toBe(1);
    });

    it('ignores duplicate startRound calls during a round', () => {
      tracker.startRound(1000);
      tracker.startRound(2000);
      tracker.endRound(3000);
      expect(tracker.getSummary(3000).rounds).toBe(1);
    });

    it('ignores endRound when no round is active', () => {
      tracker.startSession(1000);
      tracker.endRound(2000);
      expect(tracker.getPhase()).toBe('between_rounds');
      expect(tracker.getSummary(2000).rounds).toBe(0);
    });

    it('endSession closes an in-progress round and reports duration', () => {
      tracker.startSession(1000);
      tracker.startRound(2000);
      const summary = tracker.endSession(61000);
      expect(tracker.getPhase()).toBe('ended');
      expect(summary.rounds).toBe(1);
      expect(summary.duration).toBe(60000);
    });

    it('reset returns the tracker to a pristine state', () => {
      tracker.startRound(1000);
      tracker.recordFrame(makeFrame({ timestamp: 1500, activePunch: makePunch() }));
      tracker.reset();
      expect(tracker.getPhase()).toBe('idle');
      const summary = tracker.getSummary(2000);
      expect(summary.rounds).toBe(0);
      expect(summary.totalPunches).toBe(0);
      expect(summary.duration).toBe(0);
    });
  });

  describe('frame recording', () => {
    it('ignores frames outside an active round', () => {
      tracker.startSession(1000);
      tracker.recordFrame(makeFrame({ timestamp: 1500, activePunch: makePunch() }));
      expect(tracker.getSummary(2000).totalPunches).toBe(0);
    });

    it('averages guard and base scores across frames', () => {
      tracker.startRound(1000);
      tracker.recordFrame(
        makeFrame({ timestamp: 1100, guard: makeGuard({ overall: 80 }), base: makeBase({ overall: 90 }) })
      );
      tracker.recordFrame(
        makeFrame({ timestamp: 1200, guard: makeGuard({ overall: 90 }), base: makeBase({ overall: 70 }) })
      );
      const summary = tracker.getSummary(2000);
      expect(summary.avgGuardScore).toBe(85);
      expect(summary.avgBaseScore).toBe(80);
    });

    it('averages across multiple rounds', () => {
      tracker.startRound(1000);
      tracker.recordFrame(makeFrame({ timestamp: 1100, guard: makeGuard({ overall: 60 }) }));
      tracker.endRound(2000);
      tracker.startRound(3000);
      tracker.recordFrame(makeFrame({ timestamp: 3100, guard: makeGuard({ overall: 100 }) }));
      tracker.endRound(4000);
      expect(tracker.getSummary(5000).avgGuardScore).toBe(80);
    });

    it('reports 0 averages when no frames were recorded', () => {
      tracker.startSession(1000);
      const summary = tracker.getSummary(2000);
      expect(summary.avgGuardScore).toBe(0);
      expect(summary.avgBaseScore).toBe(0);
    });

    it('counts punches and builds the per-type breakdown', () => {
      tracker.startRound(1000);
      tracker.recordFrame(makeFrame({ timestamp: 1100, activePunch: makePunch({ type: 'jab', timestamp: 1100 }) }));
      tracker.recordFrame(makeFrame({ timestamp: 1200, activePunch: makePunch({ type: 'cross', timestamp: 1200 }) }));
      tracker.recordFrame(makeFrame({ timestamp: 1300, activePunch: makePunch({ type: 'jab', timestamp: 1300 }) }));
      const summary = tracker.getSummary(2000);
      expect(summary.totalPunches).toBe(3);
      expect(summary.punchBreakdown.jab).toBe(2);
      expect(summary.punchBreakdown.cross).toBe(1);
      expect(summary.punchBreakdown.lead_hook).toBe(0);
    });

    it('dedupes the same punch event repeated across frames', () => {
      tracker.startRound(1000);
      const punch = makePunch({ timestamp: 1100 });
      tracker.recordFrame(makeFrame({ timestamp: 1100, activePunch: punch }));
      tracker.recordFrame(makeFrame({ timestamp: 1133, activePunch: punch }));
      expect(tracker.getSummary(2000).totalPunches).toBe(1);
    });

    it('includes the in-progress round in running summaries', () => {
      tracker.startRound(1000);
      tracker.recordFrame(makeFrame({ timestamp: 1100, activePunch: makePunch({ timestamp: 1100 }) }));
      const summary = tracker.getSummary(1500);
      expect(summary.totalPunches).toBe(1);
      // rounds only counts completed rounds
      expect(summary.rounds).toBe(0);
    });
  });

  describe('corrections', () => {
    it('surfaces corrections repeated 3 or more times as a key + count', () => {
      tracker.startRound(1000);
      tracker.recordCorrection('guard:hand-height', 1100);
      tracker.recordCorrection('guard:hand-height', 1200);
      tracker.recordCorrection('guard:hand-height', 1300);
      const summary = tracker.getSummary(2000);
      expect(summary.corrections).toContainEqual({
        key: 'notes.correction.guardHandHeight',
        params: { count: 3 },
      });
    });

    it('maps every coaching rule to a correction key', () => {
      // Any rule the coach can fire must have a sentence to show for it.
      for (const ruleKey of Object.keys(COACHING_PHRASE_KEYS)) {
        if (ruleKey === 'punch:good' || ruleKey === 'form:excellent') continue; // praise, not a fix
        expect(CORRECTION_NOTE_KEYS[ruleKey], `sem nota p/ ${ruleKey}`).toBeTruthy();
      }
    });

    it('hides corrections below the recurrence threshold', () => {
      tracker.startRound(1000);
      tracker.recordCorrection('guard:hand-height', 1100);
      tracker.recordCorrection('guard:hand-height', 1200);
      expect(tracker.getSummary(2000).corrections).toEqual([]);
    });

    it('sorts corrections by recurrence count', () => {
      tracker.startRound(1000);
      for (let i = 0; i < 3; i += 1) tracker.recordCorrection('base:foot-width', 1100 + i);
      for (let i = 0; i < 5; i += 1) tracker.recordCorrection('guard:critical', 1100 + i);
      const corrections = tracker.getSummary(2000).corrections;
      expect(corrections[0]).toEqual({
        key: 'notes.correction.guardCritical',
        params: { count: 5 },
      });
      expect(corrections[1]).toEqual({
        key: 'notes.correction.baseFootWidth',
        params: { count: 3 },
      });
    });

    it('falls back to a generic note carrying the raw rule key', () => {
      tracker.startRound(1000);
      for (let i = 0; i < 3; i += 1) tracker.recordCorrection('custom:rule', 1100 + i);
      expect(tracker.getSummary(2000).corrections).toContainEqual({
        key: GENERIC_CORRECTION_NOTE_KEY,
        params: { rule: 'custom:rule', count: 3 },
      });
    });

    it('ignores corrections recorded outside a round', () => {
      tracker.startSession(1000);
      for (let i = 0; i < 3; i += 1) tracker.recordCorrection('guard:critical', 1100 + i);
      expect(tracker.getSummary(2000).corrections).toEqual([]);
    });
  });

  describe('highlights', () => {
    function highFrame(timestamp: number) {
      return makeFrame({
        timestamp,
        guard: makeGuard({ overall: 90 }),
        base: makeBase({ overall: 90 }),
      });
    }

    it('highlights sustained high-score streaks of 8s or more', () => {
      tracker.startRound(0);
      for (let t = 0; t <= 9000; t += 1000) {
        tracker.recordFrame(highFrame(t));
      }
      tracker.endRound(9500);
      const highlights = tracker.getSummary(10000).highlights;
      expect(highlights).toContainEqual({
        key: HIGH_SCORE_STREAK_NOTE_KEY,
        params: { round: 1, seconds: 9 },
      });
    });

    it('does not highlight streaks broken by low-score frames', () => {
      tracker.startRound(0);
      for (let t = 0; t <= 5000; t += 1000) tracker.recordFrame(highFrame(t));
      tracker.recordFrame(makeFrame({ timestamp: 6000, guard: makeGuard({ overall: 50 }) }));
      for (let t = 7000; t <= 12000; t += 1000) tracker.recordFrame(highFrame(t));
      tracker.endRound(12500);
      expect(tracker.getSummary(13000).highlights).toEqual([]);
    });

    it('highlights rounds with 5 or more good punches', () => {
      tracker.startRound(0);
      for (let i = 0; i < 5; i += 1) {
        tracker.recordFrame(
          makeFrame({
            timestamp: 1000 + i * 500,
            activePunch: makePunch({ quality: 'good', timestamp: 1000 + i * 500 }),
          })
        );
      }
      tracker.endRound(5000);
      const highlights = tracker.getSummary(6000).highlights;
      expect(highlights).toContainEqual({
        key: GOOD_PUNCHES_NOTE_KEY,
        params: { round: 1, count: 5 },
      });
    });

    it('does not highlight rounds with fewer than 5 good punches', () => {
      tracker.startRound(0);
      for (let i = 0; i < 4; i += 1) {
        tracker.recordFrame(
          makeFrame({
            timestamp: 1000 + i * 500,
            activePunch: makePunch({ quality: 'good', timestamp: 1000 + i * 500 }),
          })
        );
      }
      tracker.endRound(5000);
      expect(tracker.getSummary(6000).highlights).toEqual([]);
    });
  });
});
