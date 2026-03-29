import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import type { AnalysisFrame } from '../engine/types';
import { evaluateFrame, selectFeedback } from '../engine/CoachingRules';

interface UseVoiceCoachOptions {
  frame: AnalysisFrame | null;
  enabled: boolean;
}

/**
 * Minimum interval between any speech output (ms).
 * Prevents overlapping/rapid-fire speech.
 */
const MIN_SPEECH_INTERVAL = 3000;

/**
 * Minimum consecutive frames the same feedback must be selected
 * before it is spoken. Avoids reacting to momentary flickers.
 */
const DEBOUNCE_FRAMES = 10;

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
export function useVoiceCoach({ frame, enabled }: UseVoiceCoachOptions) {
  const lastSpokenRef = useRef(new Map<string, number>());
  const lastSpeechTimeRef = useRef(0);
  const pendingMessageRef = useRef<string | null>(null);
  const pendingCountRef = useRef(0);

  const isSpeaking = useSyncExternalStore(
    subscribeSpeaking,
    getSpeakingSnapshot,
    getServerSnapshot
  );

  const speak = useCallback((text: string): boolean => {
    if (
      typeof speechSynthesis === 'undefined' ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return false;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
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
      pendingMessageRef.current = null;
      pendingCountRef.current = 0;
      return;
    }

    // No-op on browsers without Web Speech API
    if (typeof speechSynthesis === 'undefined') return;

    const now = performance.now();

    // Global rate limit
    if (now - lastSpeechTimeRef.current < MIN_SPEECH_INTERVAL) return;

    const candidates = evaluateFrame(frame);
    const selected = selectFeedback(candidates, lastSpokenRef.current, now);

    if (!selected) {
      pendingMessageRef.current = null;
      pendingCountRef.current = 0;
      return;
    }

    // Immediate feedback (e.g. single-frame punch events) bypasses the
    // per-candidate debounce so it is never silently dropped.
    // Uses an early-return path to avoid disturbing pending debounce state
    // that may be accumulating for a concurrent non-immediate message.
    if (selected.immediate) {
      const spoken = speak(selected.message);
      if (spoken) {
        lastSpokenRef.current.set(selected.message, now);
        lastSpeechTimeRef.current = now;
      }
      return;
    }

    // Per-candidate debounce: same message must persist for N frames
    if (selected.message === pendingMessageRef.current) {
      pendingCountRef.current++;
    } else {
      pendingMessageRef.current = selected.message;
      pendingCountRef.current = 1;
    }

    if (pendingCountRef.current < DEBOUNCE_FRAMES) return;

    pendingMessageRef.current = null;
    pendingCountRef.current = 0;

    // Only update cooldowns if speech actually fires
    const spoken = speak(selected.message);
    if (spoken) {
      lastSpokenRef.current.set(selected.message, now);
      lastSpeechTimeRef.current = now;
    }
  }, [frame, enabled, speak]);

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

  return { isSpeaking };
}
