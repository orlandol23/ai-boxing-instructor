import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionSummary } from '../engine/types';
import { applySession, type SessionGains } from '../engine/gamification/applySession';
import { DEFAULT_PROFILE_ID, type ProfileHistory } from '../engine/gamification/types';
import { createHistoryStore } from '../services/historyStore';
import { useProfiles } from '../contexts/ProfileContext';

interface UseGamificationReturn {
  /** The active profile's history (partitioned by profileId, F7). */
  history: ProfileHistory;
  /** Applies a finished session to the history and persists it; returns the gains. */
  recordSession: (summary: SessionSummary) => SessionGains;
  /** Attaches the AI coach feedback (which arrives async) to the recorded session. */
  attachCoachFeedback: (sessionId: string, feedback: string) => void;
}

/**
 * React ↔ gamification engine + HistoryStore bridge. Local state mirrors
 * the persisted document; every rule lives in the pure engine. It always
 * reads and writes in the active profile's partition (ProfileContext):
 * switching profile switches XP, badges, quests and history together.
 */
export function useGamification(): UseGamificationReturn {
  const { activeProfile } = useProfiles();
  const profileId = activeProfile?.id ?? DEFAULT_PROFILE_ID;
  const store = useMemo(() => createHistoryStore(), []);
  const [history, setHistory] = useState<ProfileHistory>(() => store.load(profileId));

  // A profile switch at runtime reloads the new profile's partition.
  useEffect(() => {
    setHistory(store.load(profileId));
  }, [store, profileId]);

  const recordSession = useCallback(
    (summary: SessionSummary): SessionGains => {
      // Reload before applying so writes from another tab are not overwritten.
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
