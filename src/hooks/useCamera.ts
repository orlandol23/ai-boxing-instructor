import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { TextNote } from '../i18n/types';

export type FacingMode = 'user' | 'environment';

interface UseCameraOptions {
  initialFacing?: FacingMode;
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  facingMode: FacingMode;
  isReady: boolean;
  /**
   * Failure as an i18n key, not a sentence — this hook talks to the
   * platform, the UI decides which language to say it in.
   */
  error: TextNote | null;
  toggleCamera: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { initialFacing = 'user', width = 640, height = 480 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacing);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<TextNote | null>(null);

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    async function startCamera() {
      try {
        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          if (video && video.srcObject === streamRef.current) {
            video.pause();
            video.srcObject = null;
          }
          streamRef.current = null;
          setStream(null);
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (video) {
          video.srcObject = mediaStream;

          // Set readiness once the video has enough data to play
          video.addEventListener('canplay', () => {
            if (!cancelled) setIsReady(true);
          }, { once: true });

          // play() can reject due to autoplay policy / iOS quirks even when
          // getUserMedia succeeds. Handle separately so the stream is still usable.
          video.play().catch(() => {
            // Playback blocked by platform policy — stream remains active.
          });
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        let key = 'camera.error.generic';

        if (!window.isSecureContext) {
          key = 'camera.error.insecureContext';
        } else if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
              key = 'camera.error.permissionDenied';
              break;
            case 'NotFoundError':
              key = 'camera.error.notFound';
              break;
            case 'NotReadableError':
              key = 'camera.error.inUse';
              break;
            case 'OverconstrainedError':
              key = 'camera.error.overconstrained';
              break;
          }
        }

        setError({ key });
        setIsReady(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        if (video && video.srcObject === streamRef.current) {
          video.pause();
          video.srcObject = null;
        }
        streamRef.current = null;
        setStream(null);
      }
    };
  }, [facingMode, width, height]);

  const toggleCamera = useCallback(() => {
    setIsReady(false);
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  return { videoRef, stream, facingMode, isReady, error, toggleCamera };
}
