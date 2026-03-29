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
 * Minimum consecutive frames of a condition before speaking.
 * Avoids reacting to momentary dips.
 */
const DEBOUNCE_FRAMES = 10;

// External store for speechSynthesis.speaking state.
// Uses a listener set so useSyncExternalStore can subscribe.
const speakingListeners = new Set<() => void>();
let lastSpeakingState = false;

function notifySpeakingChange() {
  const current = typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
  if (current !== lastSpeakingState) {
    lastSpeakingState = current;
    for (const listener of speakingListeners) {
      listener();
    }
  }
}

function subscribeSpeaking(callback: () => void): () => void {
  speakingListeners.add(callback);
  return () => speakingListeners.delete(callback);
}

function getSpeakingSnapshot(): boolean {
  return lastSpeakingState;
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
 * - Frame debouncing to avoid reacting to flickers
 * - Cancels speech on disable/unmount
 */
export function useVoiceCoach({ frame, enabled }: UseVoiceCoachOptions) {
  const lastSpokenRef = useRef(new Map<string, number>());
  const lastSpeechTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastMessageRef = useRef<string | null>(null);

  const isSpeaking = useSyncExternalStore(
    subscribeSpeaking,
    getSpeakingSnapshot,
    getServerSnapshot
  );

  const speak = useCallback((text: string) => {
    if (typeof speechSynthesis === 'undefined') return;

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
  }, []);

  useEffect(() => {
    if (!enabled || !frame) {
      frameCountRef.current = 0;
      lastMessageRef.current = null;
      return;
    }

    // Debounce: only speak after consistent conditions
    frameCountRef.current++;
    if (frameCountRef.current < DEBOUNCE_FRAMES) return;

    const now = performance.now();

    // Global rate limit
    if (now - lastSpeechTimeRef.current < MIN_SPEECH_INTERVAL) return;

    const candidates = evaluateFrame(frame);
    const selected = selectFeedback(candidates, lastSpokenRef.current, now);

    if (!selected) return;

    // Avoid repeating the exact same message back-to-back
    if (selected.message === lastMessageRef.current) return;

    lastSpokenRef.current.set(selected.message, now);
    lastSpeechTimeRef.current = now;
    lastMessageRef.current = selected.message;

    speak(selected.message);
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
