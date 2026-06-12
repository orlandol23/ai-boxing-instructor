import type { PunchQuality, PunchType, RoundSummary } from '../types';

/** Perfil implícito desta fase — o F7 (perfis múltiplos) reusa o campo. */
export const DEFAULT_PROFILE_ID = 'default';

/** Registro persistido de uma sessão concluída. */
export interface SessionRecord {
  id: string;
  profileId: string;
  /** Epoch ms (relógio de parede) — usado p/ badges de horário. */
  startedAt: number;
  endedAt: number;
  /** Dia local da sessão no formato YYYY-MM-DD. */
  dateKey: string;
  durationMs: number;
  rounds: number;
  totalPunches: number;
  punchBreakdown: Record<PunchType, number>;
  punchQuality: Record<PunchQuality, number>;
  punchQualityByType: Record<PunchType, Record<PunchQuality, number>>;
  avgGuardScore: number;
  avgBaseScore: number;
  roundDetails: RoundSummary[];
  /** XP total ganho na sessão (golpes + bônus de round + missões). */
  xpGained: number;
  /** Feedback do coach IA da sessão, quando houver. */
  coachFeedback: string | null;
}

/** Agregado de um dia local — alimenta o gráfico semanal e as missões. */
export interface DailyAggregate {
  dateKey: string;
  sessions: number;
  rounds: number;
  totalPunches: number;
  goodPunches: number;
  punchQualityByType: Record<PunchType, Record<PunchQuality, number>>;
  /** Soma do score composto ((guarda+base)/2) por sessão; média = /sessions. */
  scoreSum: number;
  bestRoundGuard: number;
  bestRoundBase: number;
  xpGained: number;
}

export interface StreakState {
  /** Dias consecutivos com >= 1 sessão (contando o último dia treinado). */
  count: number;
  /** Último dia local com sessão (YYYY-MM-DD) ou null. */
  lastDate: string | null;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: number;
}

export interface LifetimeTotals {
  sessions: number;
  rounds: number;
  punches: number;
  goodPunches: number;
}

export const HISTORY_SCHEMA_VERSION = 1;

/**
 * Documento de histórico/progresso de um perfil — a unidade que o
 * HistoryStore persiste. Versionado p/ migração de schema (F6b: Neon).
 */
export interface ProfileHistory {
  schemaVersion: number;
  profileId: string;
  totalXp: number;
  lifetime: LifetimeTotals;
  streak: StreakState;
  unlockedBadges: UnlockedBadge[];
  /** Sessões mais recentes por último; limitado a MAX_STORED_SESSIONS. */
  sessions: SessionRecord[];
  dailyAggregates: Record<string, DailyAggregate>;
  /** dateKey -> ids de missões já completadas naquele dia. */
  completedQuests: Record<string, string[]>;
}

/** Limite de sessões detalhadas guardadas (agregados diários não expiram). */
export const MAX_STORED_SESSIONS = 200;

export function emptyLifetime(): LifetimeTotals {
  return { sessions: 0, rounds: 0, punches: 0, goodPunches: 0 };
}

export function emptyHistory(profileId: string = DEFAULT_PROFILE_ID): ProfileHistory {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    profileId,
    totalXp: 0,
    lifetime: emptyLifetime(),
    streak: { count: 0, lastDate: null },
    unlockedBadges: [],
    sessions: [],
    dailyAggregates: {},
    completedQuests: {},
  };
}
