import { useCallback, useEffect, useRef, useState } from 'react';

export type FacingMode = 'user' | 'environment';

interface UseCameraOptions {
  initialFacing?: FacingMode;
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  facingMode: FacingMode;
  isReady: boolean;
  error: string | null;
  toggleCamera: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { initialFacing = 'user', width = 640, height = 480 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacing);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: FacingMode) => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setIsReady(true);
      }

      setStream(mediaStream);
      setError(null);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permissão de câmera negada. Habilite nas configurações do navegador.'
          : 'Não foi possível acessar a câmera.';
      setError(message);
      setIsReady(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleCamera = useCallback(() => {
    setIsReady(false);
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  return { videoRef, stream, facingMode, isReady, error, toggleCamera };
}
