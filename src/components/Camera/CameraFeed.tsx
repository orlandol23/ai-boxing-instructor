import type { RefObject } from 'react';
import type { FacingMode } from '../../hooks/useCamera';

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  facingMode: FacingMode;
}

export function CameraFeed({ videoRef, facingMode }: CameraFeedProps) {
  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-contain bg-black"
      style={{
        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
      }}
      playsInline
      muted
      autoPlay
    />
  );
}
