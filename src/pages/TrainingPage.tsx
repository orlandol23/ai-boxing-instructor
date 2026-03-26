import { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { CameraFeed } from '../components/Camera/CameraFeed';
import { PoseCanvas } from '../components/Camera/PoseCanvas';
import { CameraControls } from '../components/Camera/CameraControls';
import { StatusBar } from '../components/HUD/StatusBar';

export function TrainingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  const { videoRef, facingMode, isReady, error: cameraError, toggleCamera } = useCamera({
    initialFacing: 'user',
    width: 640,
    height: 480,
  });

  const {
    landmarks,
    isLoading: isModelLoading,
    fps,
    error: poseError,
  } = useMediaPipe({
    videoRef,
    isVideoReady: isReady,
    frameSkip: 1,
  });

  // Resize canvas to match container
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  const error = cameraError || poseError;

  return (
    <div className="flex flex-1 flex-col">
      {/* Camera viewport */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-black">
        <CameraFeed videoRef={videoRef} facingMode={facingMode} />

        <PoseCanvas
          landmarks={landmarks}
          width={dimensions.width}
          height={dimensions.height}
          facingMode={facingMode}
        />

        <CameraControls onToggleCamera={toggleCamera} fps={fps} />

        <StatusBar
          isModelLoading={isModelLoading}
          hasLandmarks={landmarks !== null}
          error={error}
        />
      </div>
    </div>
  );
}
