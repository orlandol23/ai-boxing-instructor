import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

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
  error: string | null;
  toggleCamera: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { initialFacing = 'user', width = 640, height = 480 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacing);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
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

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsReady(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Permissão de câmera negada. Habilite nas configurações do navegador.'
            : 'Não foi possível acessar a câmera.';
        setError(message);
        setIsReady(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
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
