import { useEffect, useRef } from 'react';
import type { Landmark, GuardScore, BaseScore } from '../../engine/types';
import { PoseLandmark } from '../../engine/types';
import type { FacingMode } from '../../hooks/useCamera';
import { SKELETON_CONNECTIONS, VISIBILITY_THRESHOLD, getScoreColor } from '../../engine/constants';

interface PoseCanvasProps {
  landmarks: Landmark[] | null;
  width: number;
  height: number;
  facingMode: FacingMode;
  videoWidth: number;
  videoHeight: number;
  guardScore?: GuardScore | null;
  baseScore?: BaseScore | null;
}

const JOINT_RADIUS = 5;
const LINE_WIDTH = 3;

/**
 * Computes the display rect for object-contain behavior:
 * how the video is scaled/positioned inside the container.
 */
function getContainRect(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number
) {
  if (videoW === 0 || videoH === 0) {
    return { offsetX: 0, offsetY: 0, drawW: containerW, drawH: containerH };
  }

  const containerAspect = containerW / containerH;
  const videoAspect = videoW / videoH;

  let drawW: number;
  let drawH: number;

  if (videoAspect > containerAspect) {
    drawW = containerW;
    drawH = containerW / videoAspect;
  } else {
    drawH = containerH;
    drawW = containerH * videoAspect;
  }

  return {
    offsetX: (containerW - drawW) / 2,
    offsetY: (containerH - drawH) / 2,
    drawW,
    drawH,
  };
}

export function PoseCanvas({
  landmarks,
  width,
  height,
  facingMode,
  videoWidth,
  videoHeight,
  guardScore,
  baseScore,
}: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMirrored = facingMode === 'user';

  // Resize canvas backing store only when dimensions change (not every frame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }, [width, height]);

  // Draw skeleton overlay per frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    const { offsetX, offsetY, drawW, drawH } = getContainRect(
      width,
      height,
      videoWidth,
      videoHeight
    );

    const toScreen = (lm: Landmark) => ({
      x: offsetX + (isMirrored ? (1 - lm.x) : lm.x) * drawW,
      y: offsetY + lm.y * drawH,
    });

    // Build color map for joints based on scores
    const jointColors = buildJointColorMap(guardScore ?? null, baseScore ?? null);

    // Draw connections
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start.visibility < VISIBILITY_THRESHOLD || end.visibility < VISIBILITY_THRESHOLD) continue;

      const p1 = toScreen(start);
      const p2 = toScreen(end);

      // Use the color of the lower-scored endpoint
      const c1 = jointColors.get(startIdx);
      const c2 = jointColors.get(endIdx);
      ctx.strokeStyle = c1 ?? c2 ?? getScoreColor(100);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (lm.visibility < VISIBILITY_THRESHOLD) continue;

      const p = toScreen(lm);
      const color = jointColors.get(i) ?? getScoreColor(100);

      ctx.beginPath();
      ctx.arc(p.x, p.y, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [landmarks, width, height, isMirrored, videoWidth, videoHeight, guardScore, baseScore]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{
        width,
        height,
        pointerEvents: 'none',
      }}
    />
  );
}

/**
 * Maps joint indices to colors based on guard and base scores.
 * Upper body joints (wrists, elbows, shoulders) reflect guard score.
 * Lower body joints (ankles, knees, hips) reflect base score.
 */
function buildJointColorMap(
  guard: GuardScore | null,
  base: BaseScore | null
): Map<number, string> {
  const map = new Map<number, string>();

  if (guard) {
    const guardColor = getScoreColor(guard.overall);

    // Left arm — uses left hand height
    const leftArmColor = getScoreColor(guard.leftHandHeight);
    map.set(PoseLandmark.LEFT_WRIST, leftArmColor);
    map.set(PoseLandmark.LEFT_INDEX, leftArmColor);
    map.set(PoseLandmark.LEFT_PINKY, leftArmColor);
    map.set(PoseLandmark.LEFT_THUMB, leftArmColor);

    // Right arm — uses right hand height
    const rightArmColor = getScoreColor(guard.rightHandHeight);
    map.set(PoseLandmark.RIGHT_WRIST, rightArmColor);
    map.set(PoseLandmark.RIGHT_INDEX, rightArmColor);
    map.set(PoseLandmark.RIGHT_PINKY, rightArmColor);
    map.set(PoseLandmark.RIGHT_THUMB, rightArmColor);

    // Elbows — uses elbow tuck
    const elbowColor = getScoreColor(guard.elbowTuck);
    map.set(PoseLandmark.LEFT_ELBOW, elbowColor);
    map.set(PoseLandmark.RIGHT_ELBOW, elbowColor);

    // Shoulders — overall guard
    map.set(PoseLandmark.LEFT_SHOULDER, guardColor);
    map.set(PoseLandmark.RIGHT_SHOULDER, guardColor);
  }

  if (base) {
    const baseColor = getScoreColor(base.overall);

    // Knees — uses knee flex
    const kneeColor = getScoreColor(base.kneeFlex);
    map.set(PoseLandmark.LEFT_KNEE, kneeColor);
    map.set(PoseLandmark.RIGHT_KNEE, kneeColor);

    // Ankles/feet — uses foot width
    const footColor = getScoreColor(base.footWidth);
    map.set(PoseLandmark.LEFT_ANKLE, footColor);
    map.set(PoseLandmark.RIGHT_ANKLE, footColor);
    map.set(PoseLandmark.LEFT_HEEL, footColor);
    map.set(PoseLandmark.RIGHT_HEEL, footColor);
    map.set(PoseLandmark.LEFT_FOOT_INDEX, footColor);
    map.set(PoseLandmark.RIGHT_FOOT_INDEX, footColor);

    // Hips — overall base
    map.set(PoseLandmark.LEFT_HIP, baseColor);
    map.set(PoseLandmark.RIGHT_HIP, baseColor);
  }

  return map;
}
