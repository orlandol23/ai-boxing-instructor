import type { FacingMode } from '../../hooks/useCamera';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: FacingMode;
}

export function CameraFeed({ videoRef, facingMode }: CameraFeedProps) {
  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
      }}
      playsInline
      muted
      autoPlay
    />
  );
}
