import { useEffect, useLayoutEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisFrame } from '../engine/types';
import { evaluateFrame, selectFeedback } from '../engine/CoachingRules';
import { VOICE_MIN_SPEECH_INTERVAL, VOICE_DEBOUNCE_FRAMES } from '../engine/constants';

interface UseVoiceCoachOptions {
  frame: AnalysisFrame | null;
  enabled: boolean;
  /**
   * Called every time a feedback rule is actually spoken. Receives the
   * stable ruleKey of the selected rule so consumers (e.g. SessionTracker)
   * can count recurring issues without re-implementing rule selection.
   */
  onSpoken?: (ruleKey: string) => void;
}

// External store for speechSynthesis.speaking state.
// Uses a listener set so useSyncExternalStore can subscribe.
const speakingListeners = new Set<() => void>();

function notifySpeakingChange() {
  for (const listener of speakingListeners) {
    listener();
  }
}

function subscribeSpeaking(callback: () => void): () => void {
  speakingListeners.add(callback);
  // Sync initial state for this subscriber in case subscription starts mid-speech
  callback();
  return () => speakingListeners.delete(callback);
}

function getSpeakingSnapshot(): boolean {
  if (typeof speechSynthesis !== 'undefined') {
    return speechSynthesis.speaking;
  }
  return false;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Voice coach hook that converts boxing analysis into spoken feedback
 * using the Web Speech API (speechSynthesis).
 *
 * Features:
 * - Priority-based feedback selection
 * - Per-message cooldown to avoid repetition
 * - Per-candidate frame debouncing (N consecutive frames)
 * - Cancels speech on disable/unmount
 */
export function useVoiceCoach({ frame, enabled, onSpoken }: UseVoiceCoachOptions) {
  const { t, i18n } = useTranslation();
  const lastSpokenRef = useRef(new Map<string, number>());
  const lastSpeechTimeRef = useRef(0);
  const pendingRuleRef = useRef<string | null>(null);
  const pendingCountRef = useRef(0);
  const onSpokenRef = useRef(onSpoken);
  useLayoutEffect(() => {
    onSpokenRef.current = onSpoken;
  }, [onSpoken]);

  const isSpeaking = useSyncExternalStore(
    subscribeSpeaking,
    getSpeakingSnapshot,
    getServerSnapshot
  );

  const localeRef = useRef(i18n.resolvedLanguage ?? i18n.language);
  useLayoutEffect(() => {
    localeRef.current = i18n.resolvedLanguage ?? i18n.language;
  }, [i18n.resolvedLanguage, i18n.language]);

  const speak = useCallback((text: string): boolean => {
    if (
      typeof speechSynthesis === 'undefined' ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return false;
    }

    // Safety-net: cancel any ongoing speech before queueing a new one.
    // VOICE_MIN_SPEECH_INTERVAL prevents rapid cancel+speak sequences.
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // The spoken language follows the UI language (EN default, PT-BR opt-in).
    utterance.lang = localeRef.current;
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => notifySpeakingChange();
    utterance.onend = () => notifySpeakingChange();
    utterance.onerror = () => notifySpeakingChange();

    speechSynthesis.speak(utterance);
    return true;
  }, []);

  useEffect(() => {
    if (!enabled || !frame) {
      pendingRuleRef.current = null;
      pendingCountRef.current = 0;
      return;
    }

    // No-op on browsers without Web Speech API
    if (typeof speechSynthesis === 'undefined') return;

    const now = performance.now();

    // Global rate limit
    if (now - lastSpeechTimeRef.current < VOICE_MIN_SPEECH_INTERVAL) return;

    const candidates = evaluateFrame(frame);
    const selected = selectFeedback(candidates, lastSpokenRef.current, now);

    if (!selected) {
      pendingRuleRef.current = null;
      pendingCountRef.current = 0;
      return;
    }

    // Immediate feedback (e.g. single-frame punch events) bypasses the
    // per-candidate debounce so it is never silently dropped.
    if (selected.immediate) {
      const spoken = speak(t(selected.messageKey));
      if (spoken) {
        lastSpokenRef.current.set(selected.ruleKey, now);
        lastSpeechTimeRef.current = now;
        pendingRuleRef.current = null;
        pendingCountRef.current = 0;
        onSpokenRef.current?.(selected.ruleKey);
      }
      return;
    }

    // Per-candidate debounce: same rule must persist for N frames.
    // Keyed on ruleKey so phrase variants don't reset the counter.
    if (selected.ruleKey === pendingRuleRef.current) {
      pendingCountRef.current++;
    } else {
      pendingRuleRef.current = selected.ruleKey;
      pendingCountRef.current = 1;
    }

    if (pendingCountRef.current < VOICE_DEBOUNCE_FRAMES) return;

    pendingRuleRef.current = null;
    pendingCountRef.current = 0;

    // The engine hands back a stable phrase key; the sentence is resolved
    // here, in the active language.
    const spoken = speak(t(selected.messageKey));
    if (spoken) {
      lastSpokenRef.current.set(selected.ruleKey, now);
      lastSpeechTimeRef.current = now;
      onSpokenRef.current?.(selected.ruleKey);
    }
  }, [frame, enabled, speak, t]);

  // Cancel speech when disabled
  useEffect(() => {
    if (!enabled && typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
      notifySpeakingChange();
    }
  }, [enabled]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
      notifySpeakingChange();
    }
  }, []);

  // `speak` é exposto para mensagens fora do fluxo frame-a-frame
  // (ex.: ler o feedback do coach IA ao fim do round). Não bloqueia a
  // UI: speechSynthesis é assíncrono por natureza.
  return { isSpeaking, speak, cancel };
}
