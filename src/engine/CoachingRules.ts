import type { AnalysisFrame, VoiceFeedback } from './types';

const PHRASE_STABILITY_WINDOW_MS = 1000;

/**
 * Interchangeable phrase variants per rule, as i18n keys.
 *
 * The engine stays language-free: it decides *which phrase* fires, never
 * what the phrase says. Adding a locale means adding entries under
 * `coaching.*` in `src/i18n/locales/*` — no engine change, no test change.
 * `src/i18n/__tests__/locales.test.ts` asserts every key listed here
 * exists in every locale.
 */
export const COACHING_PHRASE_KEYS = {
  'guard:critical': [
    'coaching.guard.critical.raiseGuard',
    'coaching.guard.critical.protectFace',
    'coaching.guard.critical.handsOnChin',
  ],
  'guard:hand-height': [
    'coaching.guard.handHeight.handsHigher',
    'coaching.guard.handHeight.keepHandsUp',
    'coaching.guard.handHeight.guardDropping',
  ],
  'guard:elbow-tuck': [
    'coaching.guard.elbowTuck.elbowsIn',
    'coaching.guard.elbowTuck.tuckElbows',
  ],
  'guard:chin-tuck': [
    'coaching.guard.chinTuck.chinDown',
    'coaching.guard.chinTuck.protectChin',
  ],
  'base:critical': ['coaching.base.critical.fixBase', 'coaching.base.critical.adjustFeet'],
  'base:foot-width': [
    'coaching.base.footWidth.widerStance',
    'coaching.base.footWidth.shoulderWidth',
  ],
  'base:knee-flex': [
    'coaching.base.kneeFlex.bendKnees',
    'coaching.base.kneeFlex.moreKneeBend',
  ],
  'base:weight': [
    'coaching.base.weight.distributeWeight',
    'coaching.base.weight.balanceWeight',
  ],
  'punch:good': [
    'coaching.punch.good.goodPunch',
    'coaching.punch.good.niceOne',
    'coaching.punch.good.solidShot',
  ],
  'punch:fair': ['coaching.punch.fair.snapItBack', 'coaching.punch.fair.handBackFaster'],
  'punch:poor': ['coaching.punch.poor.extendMore', 'coaching.punch.poor.rotateHips'],
  'form:excellent': [
    'coaching.form.excellent.greatPosture',
    'coaching.form.excellent.doingGreat',
    'coaching.form.excellent.goodRhythm',
  ],
} as const satisfies Record<string, readonly string[]>;

export type CoachingRuleKey = keyof typeof COACHING_PHRASE_KEYS;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Picks one phrase key for a rule. Stable within a 1s window so the same
 * frame burst does not flicker between variants.
 */
function pickPhraseKey(ruleKey: CoachingRuleKey): string {
  const keys: readonly string[] = COACHING_PHRASE_KEYS[ruleKey];
  const bucket = Math.floor(Date.now() / PHRASE_STABILITY_WINDOW_MS);
  const seed = `${bucket}:${keys.join('|')}`;
  return keys[hashString(seed) % keys.length];
}

/**
 * Evaluates an analysis frame and returns coaching feedback candidates.
 * Items are returned in evaluation order; priority-based selection
 * happens in selectFeedback(). Each rule targets a specific aspect
 * of form and includes a cooldown to prevent repetitive nagging.
 */
export function evaluateFrame(frame: AnalysisFrame): VoiceFeedback[] {
  const feedback: VoiceFeedback[] = [];

  // Guard checks
  if (frame.guard.overall < 40) {
    feedback.push({
      ruleKey: 'guard:critical',
      messageKey: pickPhraseKey('guard:critical'),
      priority: 'critical',
      category: 'guard',
      cooldownMs: 5000,
    });
  } else if (frame.guard.overall < 70) {
    if (frame.guard.leftHandHeight < 60 || frame.guard.rightHandHeight < 60) {
      feedback.push({
        ruleKey: 'guard:hand-height',
        messageKey: pickPhraseKey('guard:hand-height'),
        priority: 'high',
        category: 'guard',
        cooldownMs: 8000,
      });
    }
    if (frame.guard.elbowTuck < 60) {
      feedback.push({
        ruleKey: 'guard:elbow-tuck',
        messageKey: pickPhraseKey('guard:elbow-tuck'),
        priority: 'high',
        category: 'guard',
        cooldownMs: 8000,
      });
    }
  }

  if (frame.guard.chinTuck < 50) {
    feedback.push({
      ruleKey: 'guard:chin-tuck',
      messageKey: pickPhraseKey('guard:chin-tuck'),
      priority: 'high',
      category: 'guard',
      cooldownMs: 10000,
    });
  }

  // Base checks
  if (frame.base.overall < 40) {
    feedback.push({
      ruleKey: 'base:critical',
      messageKey: pickPhraseKey('base:critical'),
      priority: 'critical',
      category: 'base',
      cooldownMs: 5000,
    });
  } else if (frame.base.overall < 70) {
    if (frame.base.footWidth < 60) {
      feedback.push({
        ruleKey: 'base:foot-width',
        messageKey: pickPhraseKey('base:foot-width'),
        priority: 'normal',
        category: 'base',
        cooldownMs: 8000,
      });
    }
    if (frame.base.kneeFlex < 60) {
      feedback.push({
        ruleKey: 'base:knee-flex',
        messageKey: pickPhraseKey('base:knee-flex'),
        priority: 'normal',
        category: 'base',
        cooldownMs: 8000,
      });
    }
  }

  if (frame.base.weightDistribution < 50) {
    feedback.push({
      ruleKey: 'base:weight',
      messageKey: pickPhraseKey('base:weight'),
      priority: 'normal',
      category: 'base',
      cooldownMs: 10000,
    });
  }

  // Punch feedback
  if (frame.activePunch) {
    const punch = frame.activePunch;
    if (punch.quality === 'good') {
      feedback.push({
        ruleKey: 'punch:good',
        messageKey: pickPhraseKey('punch:good'),
        priority: 'low',
        category: 'encouragement',
        cooldownMs: 4000,
        immediate: true,
      });
    } else if (punch.quality === 'fair') {
      feedback.push({
        ruleKey: 'punch:fair',
        messageKey: pickPhraseKey('punch:fair'),
        priority: 'low',
        category: 'punch',
        cooldownMs: 6000,
        immediate: true,
      });
    } else if (punch.quality === 'poor') {
      feedback.push({
        ruleKey: 'punch:poor',
        messageKey: pickPhraseKey('punch:poor'),
        priority: 'normal',
        category: 'punch',
        cooldownMs: 6000,
        immediate: true,
      });
    }
  }

  // Encouragement for good form
  if (frame.guard.overall >= 90 && frame.base.overall >= 90) {
    feedback.push({
      ruleKey: 'form:excellent',
      messageKey: pickPhraseKey('form:excellent'),
      priority: 'low',
      category: 'encouragement',
      cooldownMs: 15000,
    });
  }

  return feedback;
}

const PRIORITY_ORDER: Record<VoiceFeedback['priority'], number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Selects the highest-priority feedback item that is not on cooldown.
 * Cooldown is keyed by ruleKey (not messageKey) so phrase variants
 * share the same cooldown window.
 */
export function selectFeedback(
  candidates: VoiceFeedback[],
  lastSpoken: Map<string, number>,
  now: number
): VoiceFeedback | null {
  let best: VoiceFeedback | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (const fb of candidates) {
    const lastTime = lastSpoken.get(fb.ruleKey);
    if (lastTime !== undefined && now - lastTime < fb.cooldownMs) {
      continue;
    }

    const priorityValue = PRIORITY_ORDER[fb.priority];
    if (priorityValue < bestPriority) {
      best = fb;
      bestPriority = priorityValue;
    }
  }

  return best;
}
