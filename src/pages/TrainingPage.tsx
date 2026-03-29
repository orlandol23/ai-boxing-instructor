import { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useBoxingAnalysis } from '../hooks/useBoxingAnalysis';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { CameraFeed } from '../components/Camera/CameraFeed';
import { PoseCanvas } from '../components/Camera/PoseCanvas';
import { CameraControls } from '../components/Camera/CameraControls';
import { StatusBar } from '../components/HUD/StatusBar';
import { ScorePanel } from '../components/HUD/ScorePanel';
import { VoiceToggle } from '../components/HUD/VoiceToggle';

export function TrainingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

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

  const { frame, recentPunches, punchCount } = useBoxingAnalysis({ landmarks });

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { isSpeaking } = useVoiceCoach({ frame, enabled: voiceEnabled });

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

  // Track video intrinsic dimensions for overlay alignment
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onLoadedMetadata() {
      if (video) {
        setVideoDimensions({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    // If already loaded
    if (video.videoWidth > 0) {
      onLoadedMetadata();
    }

    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }, [videoRef, isReady]);

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
          videoWidth={videoDimensions.width}
          videoHeight={videoDimensions.height}
          guardScore={frame?.guard}
          baseScore={frame?.base}
        />

        <CameraControls onToggleCamera={toggleCamera} fps={fps} />

        <VoiceToggle
          enabled={voiceEnabled}
          isSpeaking={isSpeaking}
          onToggle={() => setVoiceEnabled((v) => !v)}
        />

        <ScorePanel
          frame={frame}
          punchCount={punchCount}
          recentPunches={recentPunches}
        />

        <StatusBar
          isModelLoading={isModelLoading}
          hasLandmarks={landmarks !== null}
          error={error}
          isCameraReady={isReady}
        />
      </div>
    </div>
  );
}
