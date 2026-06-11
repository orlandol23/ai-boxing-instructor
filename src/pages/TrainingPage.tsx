import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useBoxingAnalysis } from '../hooks/useBoxingAnalysis';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { useSession } from '../hooks/useSession';
import { CameraFeed } from '../components/Camera/CameraFeed';
import { PoseCanvas } from '../components/Camera/PoseCanvas';
import { CameraControls } from '../components/Camera/CameraControls';
import { StatusBar } from '../components/HUD/StatusBar';
import { ScorePanel } from '../components/HUD/ScorePanel';
import { SessionControls } from '../components/HUD/SessionControls';
import { SessionSummary } from '../components/HUD/SessionSummary';

export function TrainingPage() {
  const navigate = useNavigate();
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

  const {
    phase,
    currentRound,
    roundElapsedMs,
    summary,
    startSession,
    startRound,
    endRound,
    endSession,
    recordCorrection,
    reset: resetSession,
  } = useSession({ frame });

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { isSpeaking } = useVoiceCoach({
    frame,
    enabled: voiceEnabled,
    onSpoken: recordCorrection,
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
    if (video.videoWidth > 0) {
      onLoadedMetadata();
    }

    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }, [videoRef, isReady]);

  // Single-click "Iniciar treino": start session and round 1 together.
  const handleStartSession = useCallback(() => {
    startSession();
    startRound();
  }, [startSession, startRound]);

  const handleRestart = useCallback(() => {
    resetSession();
    startSession();
    startRound();
  }, [resetSession, startSession, startRound]);

  const handleHome = useCallback(() => {
    resetSession();
    navigate('/');
  }, [resetSession, navigate]);

  return (
    <div className="flex flex-1 flex-col">
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

        <ScorePanel
          frame={frame}
          punchCount={punchCount}
          recentPunches={recentPunches}
        />

        <SessionControls
          phase={phase}
          currentRound={currentRound}
          roundElapsedMs={roundElapsedMs}
          voiceEnabled={voiceEnabled}
          isSpeaking={isSpeaking}
          onToggleVoice={() => setVoiceEnabled((v) => !v)}
          onStartSession={handleStartSession}
          onStartRound={startRound}
          onEndRound={endRound}
          onEndSession={endSession}
        />

        {phase === 'ended' && (
          <SessionSummary
            summary={summary}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        )}

        <StatusBar
          isModelLoading={isModelLoading}
          hasLandmarks={landmarks !== null}
          cameraError={cameraError}
          poseError={poseError}
          isCameraReady={isReady}
        />
      </div>
    </div>
  );
}
