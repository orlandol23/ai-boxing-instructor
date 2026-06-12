import type {
  AnalysisFrame,
  PunchEvent,
  PunchQuality,
  PunchType,
  RoundSummary,
  SessionSummary,
} from './types';

export type SessionPhase = 'idle' | 'between_rounds' | 'in_round' | 'ended';

interface RoundStats {
  number: number;
  startedAt: number;
  endedAt: number | null;
  guardScoreSum: number;
  baseScoreSum: number;
  sampleCount: number;
  punches: PunchEvent[];
  punchBreakdown: Record<PunchType, number>;
  highScoreStreakMs: number;
  longestHighScoreStreakMs: number;
  lastSampleAt: number | null;
  inHighScoreStreak: boolean;
}

interface CorrectionEntry {
  count: number;
  lastSeenAt: number;
}

const HIGH_SCORE_THRESHOLD = 85;
const HIGHLIGHT_MIN_STREAK_MS = 8000;
const RECURRING_CORRECTION_THRESHOLD = 3;
const RULE_KEY_LABELS: Record<string, string> = {
  'guard:critical': 'Guarda baixa em momentos críticos',
  'guard:hand-height': 'Mãos caíram da altura ideal',
  'guard:elbow-tuck': 'Cotovelos abertos com frequência',
  'guard:chin-tuck': 'Queixo exposto recorrentemente',
  'base:critical': 'Base fraca em momentos críticos',
  'base:foot-width': 'Pés fechados demais',
  'base:knee-flex': 'Joelhos travados ou pouco flexionados',
  'base:weight': 'Distribuição de peso desbalanceada',
  'punch:fair': 'Retorno da mão à guarda lento',
  'punch:poor': 'Extensão de braço ou rotação insuficiente',
};

const EMPTY_PUNCH_BREAKDOWN: Record<PunchType, number> = {
  jab: 0,
  cross: 0,
  lead_hook: 0,
  rear_hook: 0,
  lead_uppercut: 0,
  rear_uppercut: 0,
};

function newPunchBreakdown(): Record<PunchType, number> {
  return { ...EMPTY_PUNCH_BREAKDOWN };
}

function newQualityBreakdown(): Record<PunchQuality, number> {
  return { good: 0, fair: 0, poor: 0 };
}

function newQualityByType(): Record<PunchType, Record<PunchQuality, number>> {
  return {
    jab: newQualityBreakdown(),
    cross: newQualityBreakdown(),
    lead_hook: newQualityBreakdown(),
    rear_hook: newQualityBreakdown(),
    lead_uppercut: newQualityBreakdown(),
    rear_uppercut: newQualityBreakdown(),
  };
}

function roundQuality(punches: PunchEvent[]): Record<PunchQuality, number> {
  const quality = newQualityBreakdown();
  for (const p of punches) quality[p.quality] += 1;
  return quality;
}

function newRound(roundNumber: number, now: number): RoundStats {
  return {
    number: roundNumber,
    startedAt: now,
    endedAt: null,
    guardScoreSum: 0,
    baseScoreSum: 0,
    sampleCount: 0,
    punches: [],
    punchBreakdown: newPunchBreakdown(),
    highScoreStreakMs: 0,
    longestHighScoreStreakMs: 0,
    lastSampleAt: null,
    inHighScoreStreak: false,
  };
}

/**
 * Accumulates per-round and per-session statistics from analysis frames.
 *
 * Designed to be driven by useSession() from React, but the class itself
 * is framework-agnostic and trivially testable: feed frames + lifecycle
 * events, read summaries.
 *
 * Score averages are computed incrementally (running sum + count) so
 * memory is constant regardless of session length.
 */
export class SessionTracker {
  private phase: SessionPhase = 'idle';
  private sessionStartedAt: number | null = null;
  private sessionEndedAt: number | null = null;
  private completedRounds: RoundStats[] = [];
  private currentRound: RoundStats | null = null;
  private corrections: Map<string, CorrectionEntry> = new Map();
  private lastPunchTimestamp: number | null = null;

  reset(): void {
    this.phase = 'idle';
    this.sessionStartedAt = null;
    this.sessionEndedAt = null;
    this.completedRounds = [];
    this.currentRound = null;
    this.corrections = new Map();
    this.lastPunchTimestamp = null;
  }

  getPhase(): SessionPhase {
    return this.phase;
  }

  getCurrentRoundNumber(): number {
    if (this.currentRound) return this.currentRound.number;
    return this.completedRounds.length;
  }

  startSession(now: number = performance.now()): void {
    this.reset();
    this.sessionStartedAt = now;
    this.phase = 'between_rounds';
  }

  startRound(now: number = performance.now()): void {
    if (this.phase === 'idle') {
      this.startSession(now);
    }
    if (this.phase === 'in_round') {
      // Already in a round — ignore duplicate start.
      return;
    }
    const nextNumber = this.completedRounds.length + 1;
    this.currentRound = newRound(nextNumber, now);
    this.phase = 'in_round';
  }

  endRound(now: number = performance.now()): void {
    if (this.phase !== 'in_round' || !this.currentRound) return;
    this.flushHighScoreStreak();
    this.currentRound.endedAt = now;
    this.completedRounds.push(this.currentRound);
    this.currentRound = null;
    this.phase = 'between_rounds';
  }

  endSession(now: number = performance.now()): SessionSummary {
    if (this.phase === 'in_round') {
      this.endRound(now);
    }
    this.sessionEndedAt = now;
    this.phase = 'ended';
    return this.getSummary(now);
  }

  /**
   * Feeds a single analysis frame to the tracker. Only consumed while
   * a round is active; safe to call in any phase (no-op otherwise).
   *
   * Same activePunch reference is deduped via PunchClassifier upstream,
   * but we also guard here by timestamp in case of replay.
   */
  recordFrame(frame: AnalysisFrame): void {
    if (this.phase !== 'in_round' || !this.currentRound) return;

    const round = this.currentRound;
    round.guardScoreSum += frame.guard.overall;
    round.baseScoreSum += frame.base.overall;
    round.sampleCount += 1;

    this.updateHighScoreStreak(frame, round);

    if (frame.activePunch && frame.activePunch.timestamp !== this.lastPunchTimestamp) {
      round.punches.push(frame.activePunch);
      round.punchBreakdown[frame.activePunch.type] += 1;
      this.lastPunchTimestamp = frame.activePunch.timestamp;
    }
  }

  /**
   * Records that a coaching rule fired. Called by the consumer
   * (e.g. useVoiceCoach) so the tracker can surface recurring issues
   * as corrections in the session summary.
   */
  recordCorrection(ruleKey: string, now: number = performance.now()): void {
    if (this.phase !== 'in_round') return;
    const entry = this.corrections.get(ruleKey);
    if (entry) {
      entry.count += 1;
      entry.lastSeenAt = now;
    } else {
      this.corrections.set(ruleKey, { count: 1, lastSeenAt: now });
    }
  }

  getSummary(now: number = performance.now()): SessionSummary {
    const rounds = [...this.completedRounds];
    if (this.currentRound) {
      // Snapshot in-progress round so running summaries reflect it
      rounds.push({ ...this.currentRound, endedAt: now });
    }

    const totalSamples = rounds.reduce((s, r) => s + r.sampleCount, 0);
    const guardSum = rounds.reduce((s, r) => s + r.guardScoreSum, 0);
    const baseSum = rounds.reduce((s, r) => s + r.baseScoreSum, 0);
    const totalPunches = rounds.reduce((s, r) => s + r.punches.length, 0);

    const punchBreakdown = newPunchBreakdown();
    for (const r of rounds) {
      for (const type of Object.keys(r.punchBreakdown) as PunchType[]) {
        punchBreakdown[type] += r.punchBreakdown[type];
      }
    }

    const startedAt = this.sessionStartedAt ?? now;
    const endedAt = this.sessionEndedAt ?? now;
    const duration = Math.max(0, endedAt - startedAt);

    const punchQuality = newQualityBreakdown();
    const punchQualityByType = newQualityByType();
    for (const r of rounds) {
      for (const p of r.punches) {
        punchQuality[p.quality] += 1;
        punchQualityByType[p.type][p.quality] += 1;
      }
    }

    const roundDetails: RoundSummary[] = rounds.map((r) => ({
      number: r.number,
      durationMs: Math.max(0, (r.endedAt ?? now) - r.startedAt),
      punchCount: r.punches.length,
      avgGuardScore: r.sampleCount > 0 ? r.guardScoreSum / r.sampleCount : 0,
      avgBaseScore: r.sampleCount > 0 ? r.baseScoreSum / r.sampleCount : 0,
      punchQuality: roundQuality(r.punches),
    }));

    return {
      duration,
      rounds: this.completedRounds.length,
      totalPunches,
      punchBreakdown,
      avgGuardScore: totalSamples > 0 ? guardSum / totalSamples : 0,
      avgBaseScore: totalSamples > 0 ? baseSum / totalSamples : 0,
      corrections: this.buildCorrections(),
      highlights: this.buildHighlights(rounds),
      roundDetails,
      punchQuality,
      punchQualityByType,
    };
  }

  private updateHighScoreStreak(frame: AnalysisFrame, round: RoundStats): void {
    const isHigh =
      frame.guard.overall >= HIGH_SCORE_THRESHOLD &&
      frame.base.overall >= HIGH_SCORE_THRESHOLD;
    const now = frame.timestamp;

    if (isHigh) {
      if (round.inHighScoreStreak && round.lastSampleAt !== null) {
        round.highScoreStreakMs += now - round.lastSampleAt;
      } else {
        round.inHighScoreStreak = true;
        round.highScoreStreakMs = 0;
      }
    } else if (round.inHighScoreStreak) {
      if (round.highScoreStreakMs > round.longestHighScoreStreakMs) {
        round.longestHighScoreStreakMs = round.highScoreStreakMs;
      }
      round.inHighScoreStreak = false;
      round.highScoreStreakMs = 0;
    }

    round.lastSampleAt = now;
  }

  private flushHighScoreStreak(): void {
    if (!this.currentRound) return;
    const r = this.currentRound;
    if (r.inHighScoreStreak && r.highScoreStreakMs > r.longestHighScoreStreakMs) {
      r.longestHighScoreStreakMs = r.highScoreStreakMs;
    }
    r.inHighScoreStreak = false;
    r.highScoreStreakMs = 0;
  }

  private buildCorrections(): string[] {
    const recurring = [...this.corrections.entries()]
      .filter(([, entry]) => entry.count >= RECURRING_CORRECTION_THRESHOLD)
      .sort((a, b) => b[1].count - a[1].count);

    return recurring.map(([ruleKey, entry]) => {
      const label = RULE_KEY_LABELS[ruleKey] ?? ruleKey;
      return `${label} (${entry.count}x)`;
    });
  }

  private buildHighlights(rounds: RoundStats[]): string[] {
    const highlights: string[] = [];

    for (const r of rounds) {
      if (r.longestHighScoreStreakMs >= HIGHLIGHT_MIN_STREAK_MS) {
        const seconds = Math.round(r.longestHighScoreStreakMs / 1000);
        highlights.push(`Round ${r.number}: ${seconds}s seguidos com guarda e base acima de 85`);
      }
      const goodPunches = r.punches.filter((p) => p.quality === 'good').length;
      if (goodPunches >= 5) {
        highlights.push(`Round ${r.number}: ${goodPunches} golpes de boa qualidade`);
      }
    }

    return highlights;
  }
}
