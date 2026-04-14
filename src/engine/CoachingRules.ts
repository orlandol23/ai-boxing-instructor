import type { AnalysisFrame, VoiceFeedback } from './types';

const PHRASE_STABILITY_WINDOW_MS = 1000;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickRandom(phrases: string[]): string {
  if (phrases.length === 0) return '';

  const bucket = Math.floor(Date.now() / PHRASE_STABILITY_WINDOW_MS);
  const seed = `${bucket}:${phrases.join('|')}`;
  const index = hashString(seed) % phrases.length;
  return phrases[index];
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
      message: pickRandom(['Levanta a guarda!', 'Protege o rosto!', 'Mãos no queixo!']),
      priority: 'critical',
      category: 'guard',
      cooldownMs: 5000,
    });
  } else if (frame.guard.overall < 70) {
    if (frame.guard.leftHandHeight < 60 || frame.guard.rightHandHeight < 60) {
      feedback.push({
        message: pickRandom([
          'Mãos mais altas, protege o rosto!',
          'Mantém as mãos altas',
          'Guarda tá caindo um pouco',
        ]),
        priority: 'high',
        category: 'guard',
        cooldownMs: 8000,
      });
    }
    if (frame.guard.elbowTuck < 60) {
      feedback.push({
        message: pickRandom(['Cotovelos junto ao corpo!', 'Cola os cotovelos!']),
        priority: 'high',
        category: 'guard',
        cooldownMs: 8000,
      });
    }
  }

  if (frame.guard.chinTuck < 50) {
    feedback.push({
      message: pickRandom(['Abaixa o queixo!', 'Protege o queixo!']),
      priority: 'high',
      category: 'guard',
      cooldownMs: 10000,
    });
  }

  // Base checks
  if (frame.base.overall < 40) {
    feedback.push({
      message: pickRandom(['Corrige a base!', 'Ajusta a posição dos pés!']),
      priority: 'critical',
      category: 'base',
      cooldownMs: 5000,
    });
  } else if (frame.base.overall < 70) {
    if (frame.base.footWidth < 60) {
      feedback.push({
        message: pickRandom(['Abre mais os pés!', 'Pés na largura dos ombros!']),
        priority: 'normal',
        category: 'base',
        cooldownMs: 8000,
      });
    }
    if (frame.base.kneeFlex < 60) {
      feedback.push({
        message: pickRandom(['Flexiona os joelhos!', 'Dobra mais os joelhos!']),
        priority: 'normal',
        category: 'base',
        cooldownMs: 8000,
      });
    }
  }

  if (frame.base.weightDistribution < 50) {
    feedback.push({
      message: pickRandom(['Distribui o peso melhor!', 'Equilibra o peso entre os pés!']),
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
        message: pickRandom(['Bom golpe!', 'Mandou bem!', 'Golpe firme!']),
        priority: 'low',
        category: 'encouragement',
        cooldownMs: 4000,
        immediate: true,
      });
    } else if (punch.quality === 'fair') {
      feedback.push({
        message: pickRandom(['Retorna a mão mais rápido', 'Traz a mão de volta!']),
        priority: 'low',
        category: 'punch',
        cooldownMs: 6000,
        immediate: true,
      });
    } else if (punch.quality === 'poor') {
      feedback.push({
        message: pickRandom(['Estende mais o braço!', 'Gira mais o quadril!']),
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
      message: pickRandom([
        'Postura excelente, continua assim!',
        'Tá mandando bem!',
        'Ritmo bom, continua!',
      ]),
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
