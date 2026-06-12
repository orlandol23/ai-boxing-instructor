import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useBoxingAnalysis } from '../hooks/useBoxingAnalysis';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { useSession } from '../hooks/useSession';
import { useCoachingFeedback } from '../hooks/useCoachingFeedback';
import { useGamification } from '../hooks/useGamification';
import type { SessionGains } from '../engine/gamification/applySession';
import { CameraFeed } from '../components/Camera/CameraFeed';
import { PoseCanvas } from '../components/Camera/PoseCanvas';
import { CameraControls } from '../components/Camera/CameraControls';
import { StatusBar } from '../components/HUD/StatusBar';
import { ScorePanel } from '../components/HUD/ScorePanel';
import { SessionControls } from '../components/HUD/SessionControls';
import { SessionSummary } from '../components/HUD/SessionSummary';
import { CoachBubble } from '../components/HUD/CoachBubble';

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

  // Gamificação (F6): registra a sessão concluída e guarda os ganhos
  // (XP, badges, missões) para o resumo.
  const { recordSession, attachCoachFeedback } = useGamification();
  const [gains, setGains] = useState<SessionGains | null>(null);

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  // Correções frame-a-frame só durante o round; fora dele a voz fica
  // livre para ler o feedback do coach IA sem ser interrompida.
  const { isSpeaking, speak, cancel: cancelSpeech } = useVoiceCoach({
    frame,
    enabled: voiceEnabled && phase === 'in_round',
    onSpoken: recordCorrection,
  });

  // Desligar o toggle de voz também interrompe a leitura do coach IA.
  useEffect(() => {
    if (!voiceEnabled) cancelSpeech();
  }, [voiceEnabled, cancelSpeech]);

  const onCoachFeedback = useCallback(
    (text: string) => {
      // Voz opcional: lê o feedback do coach se o toggle estiver ativo.
      if (voiceEnabledRef.current) speak(text);
    },
    [speak]
  );

  const {
    status: coachStatus,
    feedback: coachFeedback,
    requestRoundFeedback,
    requestSessionFeedback,
    clear: clearCoach,
  } = useCoachingFeedback({ onFeedback: onCoachFeedback });

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

  // Fim de round: encerra no tracker e pede o coaching da IA com o
  // snapshot pós-round. Falhas do endpoint nunca afetam o treino.
  const handleEndRound = useCallback(() => {
    const finishedRound = currentRound;
    const snapshot = endRound();
    requestRoundFeedback(snapshot, finishedRound);
  }, [currentRound, endRound, requestRoundFeedback]);

  const handleEndSession = useCallback(() => {
    const finalSummary = endSession();
    // Sessão sem nenhum round completo não entra no histórico/XP.
    if (finalSummary.rounds > 0) {
      setGains(recordSession(finalSummary));
    }
    requestSessionFeedback(finalSummary);
  }, [endSession, recordSession, requestSessionFeedback]);

  // O feedback do coach IA chega async, depois da sessão já registrada —
  // anexa ao registro persistido quando estiver disponível.
  useEffect(() => {
    if (phase === 'ended' && coachStatus === 'success' && coachFeedback && gains) {
      attachCoachFeedback(gains.record.id, coachFeedback);
    }
  }, [phase, coachStatus, coachFeedback, gains, attachCoachFeedback]);

  const handleRestart = useCallback(() => {
    clearCoach();
    cancelSpeech();
    setGains(null);
    resetSession();
    startSession();
    startRound();
  }, [clearCoach, cancelSpeech, resetSession, startSession, startRound]);

  const handleHome = useCallback(() => {
    clearCoach();
    setGains(null);
    resetSession();
    navigate('/');
  }, [clearCoach, resetSession, navigate]);

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
          onEndRound={handleEndRound}
          onEndSession={handleEndSession}
        />

        {/* Coach IA do round — visível no descanso entre rounds */}
        {phase === 'between_rounds' && coachStatus !== 'idle' && (
          <div className="absolute inset-x-4 top-1/2 z-10 mx-auto max-w-md -translate-y-1/2">
            <CoachBubble status={coachStatus} feedback={coachFeedback} context="round" />
          </div>
        )}

        {phase === 'ended' && (
          <SessionSummary
            summary={summary}
            gains={gains}
            coachStatus={coachStatus}
            coachFeedback={coachFeedback}
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
