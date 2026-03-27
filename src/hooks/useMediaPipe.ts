import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { Landmark } from '../engine/types';

/** Target UI update rate in ms (~30 fps for React state updates) */
const UI_UPDATE_INTERVAL = 33;

interface UseMediaPipeOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  isVideoReady: boolean;
  /** Process every Nth frame (1 = every frame, 2 = every other, etc.) */
  frameSkip?: number;
}

interface UseMediaPipeReturn {
  landmarks: Landmark[] | null;
  isLoading: boolean;
  fps: number;
  error: string | null;
}

export function useMediaPipe(options: UseMediaPipeOptions): UseMediaPipeReturn {
  const { videoRef, isVideoReady, frameSkip = 1 } = options;
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const fpsCountRef = useRef(0);
  const lastTimestampRef = useRef(-1);
  const lastUiUpdateRef = useRef(0);
  const latestLandmarksRef = useRef<Landmark[] | null>(null);
  const frameSkipRef = useRef(frameSkip);

  useEffect(() => {
    frameSkipRef.current = Math.max(1, Math.floor(frameSkip));
  }, [frameSkip]);

  // Initialize PoseLandmarker
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        );

        const createLandmarker = (delegate: 'GPU' | 'CPU') =>
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          });

        // Try GPU first, fall back to CPU if not supported
        let landmarker: PoseLandmarker;
        try {
          landmarker = await createLandmarker('GPU');
        } catch {
          landmarker = await createLandmarker('CPU');
        }

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            `Erro ao carregar modelo de pose: ${err instanceof Error ? err.message : 'desconhecido'}`
          );
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
    };
  }, []);

  // Detection loop — uses refs to avoid re-creating the loop
  useEffect(() => {
    if (!isVideoReady || isLoading || error) return;

    let running = true;
    lastFpsTimeRef.current = performance.now();

    function detect() {
      if (!running) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !landmarker) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // Wait for video to be playable instead of busy-polling at ~60fps
      if (video.readyState < 2) {
        const onReady = () => {
          if (!running) return;
          rafRef.current = requestAnimationFrame(detect);
        };
        video.addEventListener('loadeddata', onReady, { once: true });
        return;
      }

      frameCountRef.current++;

      if (frameCountRef.current % frameSkipRef.current === 0) {
        const now = performance.now();

        // MediaPipe requires strictly increasing timestamps
        if (now <= lastTimestampRef.current) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }
        lastTimestampRef.current = now;

        try {
          const result = landmarker.detectForVideo(video, now);

          if (result.landmarks.length > 0) {
            latestLandmarksRef.current = result.landmarks[0].map(
              (lm) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility ?? 0,
              })
            );
          } else {
            latestLandmarksRef.current = null;
          }

          // Throttle React state updates to ~30fps
          if (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL) {
            lastUiUpdateRef.current = now;
            setLandmarks(latestLandmarksRef.current);
          }

          // FPS counter
          fpsCountRef.current++;
          if (now - lastFpsTimeRef.current >= 1000) {
            setFps(fpsCountRef.current);
            fpsCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }
        } catch (e) {
          running = false;
          setError(
            `Erro na detecção de pose: ${e instanceof Error ? e.message : 'erro desconhecido'}`
          );
          landmarkerRef.current?.close();
          landmarkerRef.current = null;
          cancelAnimationFrame(rafRef.current);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(detect);
    }

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      latestLandmarksRef.current = null;
      frameCountRef.current = 0;
      fpsCountRef.current = 0;
      setLandmarks(null);
      setFps(0);
    };
  }, [isVideoReady, isLoading, error, videoRef]);

  return { landmarks, isLoading, fps, error };
}
