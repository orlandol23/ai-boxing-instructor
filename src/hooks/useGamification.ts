import { useCallback, useMemo, useState } from 'react';
import type { SessionSummary } from '../engine/types';
import { applySession, type SessionGains } from '../engine/gamification/applySession';
import type { ProfileHistory } from '../engine/gamification/types';
import { createHistoryStore } from '../services/historyStore';

interface UseGamificationReturn {
  /** Histórico atual do perfil (default, até o F7 trazer perfis). */
  history: ProfileHistory;
  /** Aplica uma sessão concluída ao histórico e persiste; retorna os ganhos. */
  recordSession: (summary: SessionSummary) => SessionGains;
  /** Anexa o feedback do coach IA (chega async) à sessão já registrada. */
  attachCoachFeedback: (sessionId: string, feedback: string) => void;
}

/**
 * Ponte React ↔ motor de gamificação + HistoryStore. O estado local
 * espelha o documento persistido; todas as regras vivem no engine puro.
 */
export function useGamification(): UseGamificationReturn {
  const store = useMemo(() => createHistoryStore(), []);
  const [history, setHistory] = useState<ProfileHistory>(() => store.load());

  const recordSession = useCallback(
    (summary: SessionSummary): SessionGains => {
      // Recarrega antes de aplicar p/ não sobrescrever escritas de outra aba.
      const { history: next, gains } = applySession(store.load(), summary, {
        now: Date.now(),
      });
      store.save(next);
      setHistory(next);
      return gains;
    },
    [store]
  );

  const attachCoachFeedback = useCallback(
    (sessionId: string, feedback: string) => {
      const current = store.load();
      const index = current.sessions.findIndex((s) => s.id === sessionId);
      if (index < 0 || current.sessions[index].coachFeedback === feedback) return;
      const sessions = [...current.sessions];
      sessions[index] = { ...sessions[index], coachFeedback: feedback };
      const next = { ...current, sessions };
      store.save(next);
      setHistory(next);
    },
    [store]
  );

  return { history, recordSession, attachCoachFeedback };
}
