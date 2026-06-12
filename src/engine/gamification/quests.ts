import type { PunchQuality, PunchType } from '../types';
import type { DailyAggregate } from './types';

/**
 * Missões diárias (SPECS §5): 3 por dia, sorteadas deterministicamente
 * de um pool fixo com seed derivada da data local (YYYY-MM-DD) — o mesmo
 * dia sempre gera as mesmas missões, sem precisar persistir o sorteio.
 *
 * O progresso é medido contra o agregado do dia (várias sessões no mesmo
 * dia acumulam), e a conclusão é registrada em
 * `ProfileHistory.completedQuests[dateKey]` para o XP não ser pago duas
 * vezes.
 */

export interface QuestDefinition {
  id: string;
  /** Copy adulta (PT-BR); a skin RPG do kids chega no F7. */
  description: string;
  /** Recompensa em XP ao completar. */
  xp: number;
  /** Valor-alvo de `progress` para concluir. */
  target: number;
  progress(day: DailyAggregate): number;
}

function countOf(day: DailyAggregate, type: PunchType, quality?: PunchQuality): number {
  const q = day.punchQualityByType[type];
  if (!q) return 0;
  return quality ? q[quality] : q.good + q.fair + q.poor;
}

/** Pool fixo — ids estáveis (são persistidos em completedQuests). */
export const QUEST_POOL: readonly QuestDefinition[] = [
  {
    id: 'jabs_good_30',
    description: '30 jabs bons',
    xp: 50,
    target: 30,
    progress: (d) => countOf(d, 'jab', 'good'),
  },
  {
    id: 'crosses_good_20',
    description: '20 crosses bons',
    xp: 50,
    target: 20,
    progress: (d) => countOf(d, 'cross', 'good'),
  },
  {
    id: 'hooks_20',
    description: '20 hooks (qualquer mão)',
    xp: 45,
    target: 20,
    progress: (d) => countOf(d, 'lead_hook') + countOf(d, 'rear_hook'),
  },
  {
    id: 'punches_100',
    description: '100 golpes no dia',
    xp: 60,
    target: 100,
    progress: (d) => d.totalPunches,
  },
  {
    id: 'good_punches_50',
    description: '50 golpes bons no dia',
    xp: 60,
    target: 50,
    progress: (d) => d.goodPunches,
  },
  {
    id: 'rounds_3',
    description: 'Complete 3 rounds',
    xp: 40,
    target: 3,
    progress: (d) => d.rounds,
  },
  {
    id: 'guard_80_round',
    description: 'Feche um round com guarda média ≥ 80',
    xp: 50,
    target: 1,
    progress: (d) => (d.bestRoundGuard >= 80 ? 1 : 0),
  },
  {
    id: 'base_80_round',
    description: 'Feche um round com base média ≥ 80',
    xp: 40,
    target: 1,
    progress: (d) => (d.bestRoundBase >= 80 ? 1 : 0),
  },
];

export const QUESTS_PER_DAY = 3;

/** Hash FNV-1a de 32 bits da chave de data → seed do PRNG. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG determinístico mulberry32 — suficiente p/ sorteio de missões. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** As 3 missões do dia `dateKey` (determinístico, sem repetição). */
export function dailyQuests(dateKey: string): QuestDefinition[] {
  const rand = mulberry32(hashSeed(dateKey));
  const pool = [...QUEST_POOL];
  const picked: QuestDefinition[] = [];
  for (let i = 0; i < Math.min(QUESTS_PER_DAY, pool.length); i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picked.push(pool[i]);
  }
  return picked;
}

export interface QuestStatus {
  quest: QuestDefinition;
  /** Progresso atual, limitado ao alvo. */
  progress: number;
  done: boolean;
}

/** Status das missões do dia contra o agregado (ausente = dia sem treino). */
export function questStatuses(
  dateKey: string,
  day: DailyAggregate | undefined,
  completedIds: readonly string[] = []
): QuestStatus[] {
  return dailyQuests(dateKey).map((quest) => {
    const raw = day ? quest.progress(day) : 0;
    const progress = Math.min(quest.target, Math.max(0, raw));
    // Conclusão registrada é permanente no dia, mesmo que a métrica oscile.
    const done = completedIds.includes(quest.id) || progress >= quest.target;
    return { quest, progress: done ? quest.target : progress, done };
  });
}
