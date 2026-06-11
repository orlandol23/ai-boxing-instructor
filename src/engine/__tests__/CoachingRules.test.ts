import { describe, expect, it } from 'vitest';
import { evaluateFrame, selectFeedback } from '../CoachingRules';
import type { VoiceFeedback } from '../types';
import { makeBase, makeFrame, makeGuard, makePunch } from './fixtures';

function ruleKeys(feedback: VoiceFeedback[]): string[] {
  return feedback.map((f) => f.ruleKey);
}

describe('evaluateFrame', () => {
  it('fires a critical guard alert when the guard collapses (< 40)', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 39 }) })
    );
    const critical = feedback.find((f) => f.ruleKey === 'guard:critical');
    expect(critical).toBeDefined();
    expect(critical!.priority).toBe('critical');
    expect(critical!.category).toBe('guard');
  });

  it('does not fire the critical guard alert at exactly 40', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 40, leftHandHeight: 80, rightHandHeight: 80, elbowTuck: 80 }) })
    );
    expect(ruleKeys(feedback)).not.toContain('guard:critical');
  });

  it('warns about hand height when guard is mediocre and hands are low', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 60, leftHandHeight: 55 }) })
    );
    expect(ruleKeys(feedback)).toContain('guard:hand-height');
  });

  it('warns about elbow tuck when guard is mediocre and elbows are open', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 60, elbowTuck: 55 }) })
    );
    expect(ruleKeys(feedback)).toContain('guard:elbow-tuck');
  });

  it('skips hand/elbow warnings when guard overall is 70 or higher', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 70, leftHandHeight: 30, elbowTuck: 30 }) })
    );
    expect(ruleKeys(feedback)).not.toContain('guard:hand-height');
    expect(ruleKeys(feedback)).not.toContain('guard:elbow-tuck');
  });

  it('warns about chin tuck independently of the overall guard score', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 95, chinTuck: 49 }) })
    );
    expect(ruleKeys(feedback)).toContain('guard:chin-tuck');
  });

  it('does not warn about chin tuck at exactly 50', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ chinTuck: 50 }) })
    );
    expect(ruleKeys(feedback)).not.toContain('guard:chin-tuck');
  });

  it('fires a critical base alert when the base collapses (< 40)', () => {
    const feedback = evaluateFrame(
      makeFrame({ base: makeBase({ overall: 30 }) })
    );
    const critical = feedback.find((f) => f.ruleKey === 'base:critical');
    expect(critical).toBeDefined();
    expect(critical!.priority).toBe('critical');
  });

  it('warns about foot width and knee flex when base is mediocre', () => {
    const feedback = evaluateFrame(
      makeFrame({ base: makeBase({ overall: 55, footWidth: 50, kneeFlex: 50 }) })
    );
    expect(ruleKeys(feedback)).toContain('base:foot-width');
    expect(ruleKeys(feedback)).toContain('base:knee-flex');
  });

  it('warns about weight distribution below 50', () => {
    const feedback = evaluateFrame(
      makeFrame({ base: makeBase({ weightDistribution: 49 }) })
    );
    expect(ruleKeys(feedback)).toContain('base:weight');
  });

  it('encourages immediately after a good punch', () => {
    const feedback = evaluateFrame(
      makeFrame({ activePunch: makePunch({ quality: 'good' }) })
    );
    const praise = feedback.find((f) => f.ruleKey === 'punch:good');
    expect(praise).toBeDefined();
    expect(praise!.immediate).toBe(true);
    expect(praise!.category).toBe('encouragement');
  });

  it('coaches on fair and poor punches', () => {
    const fair = evaluateFrame(
      makeFrame({ activePunch: makePunch({ quality: 'fair' }) })
    );
    expect(ruleKeys(fair)).toContain('punch:fair');

    const poor = evaluateFrame(
      makeFrame({ activePunch: makePunch({ quality: 'poor' }) })
    );
    expect(ruleKeys(poor)).toContain('punch:poor');
  });

  it('praises excellent form when guard and base are both 90+', () => {
    const feedback = evaluateFrame(
      makeFrame({
        guard: makeGuard({ overall: 92 }),
        base: makeBase({ overall: 90 }),
      })
    );
    expect(ruleKeys(feedback)).toContain('form:excellent');
  });

  it('returns only encouragement for a clean high-score frame', () => {
    const feedback = evaluateFrame(
      makeFrame({
        guard: makeGuard({ overall: 95, leftHandHeight: 95, rightHandHeight: 95, elbowTuck: 95, chinTuck: 95 }),
        base: makeBase({ overall: 95, footWidth: 95, kneeFlex: 95, weightDistribution: 95 }),
      })
    );
    expect(ruleKeys(feedback)).toEqual(['form:excellent']);
  });

  it('uses messages from a known phrase set', () => {
    const feedback = evaluateFrame(
      makeFrame({ guard: makeGuard({ overall: 10 }) })
    );
    const critical = feedback.find((f) => f.ruleKey === 'guard:critical');
    expect(['Levanta a guarda!', 'Protege o rosto!', 'Mãos no queixo!']).toContain(
      critical!.message
    );
  });
});

describe('selectFeedback', () => {
  const guardCritical: VoiceFeedback = {
    ruleKey: 'guard:critical',
    message: 'Levanta a guarda!',
    priority: 'critical',
    category: 'guard',
    cooldownMs: 5000,
  };
  const footWidth: VoiceFeedback = {
    ruleKey: 'base:foot-width',
    message: 'Abre mais os pés!',
    priority: 'normal',
    category: 'base',
    cooldownMs: 8000,
  };
  const praise: VoiceFeedback = {
    ruleKey: 'punch:good',
    message: 'Bom golpe!',
    priority: 'low',
    category: 'encouragement',
    cooldownMs: 4000,
  };

  it('returns null when there are no candidates', () => {
    expect(selectFeedback([], new Map(), 1000)).toBeNull();
  });

  it('picks the highest-priority candidate', () => {
    const selected = selectFeedback(
      [praise, footWidth, guardCritical],
      new Map(),
      1000
    );
    expect(selected?.ruleKey).toBe('guard:critical');
  });

  it('skips candidates still on cooldown', () => {
    const lastSpoken = new Map([['guard:critical', 9000]]);
    const selected = selectFeedback(
      [guardCritical, footWidth],
      lastSpoken,
      10000 // 1s after last spoken, cooldown is 5s
    );
    expect(selected?.ruleKey).toBe('base:foot-width');
  });

  it('re-selects a rule once its cooldown expires', () => {
    const lastSpoken = new Map([['guard:critical', 1000]]);
    const selected = selectFeedback([guardCritical], lastSpoken, 6000);
    expect(selected?.ruleKey).toBe('guard:critical');
  });

  it('returns null when every candidate is on cooldown', () => {
    const lastSpoken = new Map([
      ['guard:critical', 9500],
      ['base:foot-width', 9500],
    ]);
    expect(selectFeedback([guardCritical, footWidth], lastSpoken, 10000)).toBeNull();
  });

  it('keeps the first candidate on priority ties', () => {
    const otherNormal: VoiceFeedback = {
      ...footWidth,
      ruleKey: 'base:knee-flex',
    };
    const selected = selectFeedback([footWidth, otherNormal], new Map(), 1000);
    expect(selected?.ruleKey).toBe('base:foot-width');
  });
});
