import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionSummary } from '../engine/types';
import { applySession, type SessionGains } from '../engine/gamification/applySession';
import { DEFAULT_PROFILE_ID, type ProfileHistory } from '../engine/gamification/types';
import { createHistoryStore } from '../services/historyStore';
import { useProfiles } from '../contexts/ProfileContext';

interface UseGamificationReturn {
  /** Histórico do perfil ativo (partição por profileId — F7). */
  history: ProfileHistory;
  /** Aplica uma sessão concluída ao histórico e persiste; retorna os ganhos. */
  recordSession: (summary: SessionSummary) => SessionGains;
  /** Anexa o feedback do coach IA (chega async) à sessão já registrada. */
  attachCoachFeedback: (sessionId: string, feedback: string) => void;
}

/**
 * Ponte React ↔ motor de gamificação + HistoryStore. O estado local
 * espelha o documento persistido; todas as regras vivem no engine puro.
 * Lê/escreve sempre na partição do perfil ativo (ProfileContext): trocar
 * de perfil troca XP, badges, missões e histórico junto.
 */
export function useGamification(): UseGamificationReturn {
  const { activeProfile } = useProfiles();
  const profileId = activeProfile?.id ?? DEFAULT_PROFILE_ID;
  const store = useMemo(() => createHistoryStore(), []);
  const [history, setHistory] = useState<ProfileHistory>(() => store.load(profileId));

  // Troca de perfil em runtime → recarrega a partição do novo perfil.
  useEffect(() => {
    setHistory(store.load(profileId));
  }, [store, profileId]);

  const recordSession = useCallback(
    (summary: SessionSummary): SessionGains => {
      // Recarrega antes de aplicar p/ não sobrescrever escritas de outra aba.
      const { history: next, gains } = applySession(store.load(profileId), summary, {
        now: Date.now(),
      });
      store.save(next);
      setHistory(next);
      return gains;
    },
    [store, profileId]
  );

  const attachCoachFeedback = useCallback(
    (sessionId: string, feedback: string) => {
      const current = store.load(profileId);
      const index = current.sessions.findIndex((s) => s.id === sessionId);
      if (index < 0 || current.sessions[index].coachFeedback === feedback) return;
      const sessions = [...current.sessions];
      sessions[index] = { ...sessions[index], coachFeedback: feedback };
      const next = { ...current, sessions };
      store.save(next);
      setHistory(next);
    },
    [store, profileId]
  );

  return { history, recordSession, attachCoachFeedback };
}
