import type { AnalysisFrame, VoiceFeedback } from './types';

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
      message: 'Levanta a guarda!',
      priority: 'critical',
      category: 'guard',
      cooldownMs: 5000,
    });
  } else if (frame.guard.overall < 70) {
    if (frame.guard.leftHandHeight < 60 || frame.guard.rightHandHeight < 60) {
      feedback.push({
        message: 'Mãos mais altas, protege o rosto!',
        priority: 'high',
        category: 'guard',
        cooldownMs: 8000,
      });
    }
    if (frame.guard.elbowTuck < 60) {
      feedback.push({
        message: 'Cotovelos junto ao corpo!',
        priority: 'high',
        category: 'guard',
        cooldownMs: 8000,
      });
    }
  }

  if (frame.guard.chinTuck < 50) {
    feedback.push({
      message: 'Abaixa o queixo!',
      priority: 'high',
      category: 'guard',
      cooldownMs: 10000,
    });
  }

  // Base checks
  if (frame.base.overall < 40) {
    feedback.push({
      message: 'Corrige a base!',
      priority: 'critical',
      category: 'base',
      cooldownMs: 5000,
    });
  } else if (frame.base.overall < 70) {
    if (frame.base.footWidth < 60) {
      feedback.push({
        message: 'Abre mais os pés!',
        priority: 'normal',
        category: 'base',
        cooldownMs: 8000,
      });
    }
    if (frame.base.kneeFlex < 60) {
      feedback.push({
        message: 'Flexiona os joelhos!',
        priority: 'normal',
        category: 'base',
        cooldownMs: 8000,
      });
    }
  }

  if (frame.base.weightDistribution < 50) {
    feedback.push({
      message: 'Distribui o peso melhor!',
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
        message: 'Bom golpe!',
        priority: 'low',
        category: 'encouragement',
        cooldownMs: 4000,
      });
    } else if (punch.quality === 'poor') {
      feedback.push({
        message: 'Estende mais o braço!',
        priority: 'normal',
        category: 'punch',
        cooldownMs: 6000,
      });
    }
  }

  // Encouragement for good form
  if (frame.guard.overall >= 90 && frame.base.overall >= 90) {
    feedback.push({
      message: 'Postura excelente, continua assim!',
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
 */
export function selectFeedback(
  candidates: VoiceFeedback[],
  lastSpoken: Map<string, number>,
  now: number
): VoiceFeedback | null {
  let best: VoiceFeedback | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (const fb of candidates) {
    const lastTime = lastSpoken.get(fb.message);
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
