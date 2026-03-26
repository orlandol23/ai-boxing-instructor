import { useEffect, useRef } from 'react';
import type { Landmark } from '../../engine/types';
import type { FacingMode } from '../../hooks/useCamera';
import { SKELETON_CONNECTIONS, SCORE_COLORS, VISIBILITY_THRESHOLD } from '../../engine/constants';

interface PoseCanvasProps {
  landmarks: Landmark[] | null;
  width: number;
  height: number;
  facingMode: FacingMode;
  videoWidth: number;
  videoHeight: number;
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
    // Video is wider — letterbox top/bottom
    drawW = containerW;
    drawH = containerW / videoAspect;
  } else {
    // Video is taller — pillarbox left/right
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
}: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMirrored = facingMode === 'user';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    const { offsetX, offsetY, drawW, drawH } = getContainRect(
      width,
      height,
      videoWidth,
      videoHeight
    );

    // Helper to map normalized landmarks to screen coordinates
    const toScreen = (lm: Landmark) => ({
      x: offsetX + (isMirrored ? (1 - lm.x) : lm.x) * drawW,
      y: offsetY + lm.y * drawH,
    });

    // Draw connections
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = SCORE_COLORS.excellent;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start.visibility < VISIBILITY_THRESHOLD || end.visibility < VISIBILITY_THRESHOLD) continue;

      const p1 = toScreen(start);
      const p2 = toScreen(end);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw joints
    for (const lm of landmarks) {
      if (lm.visibility < VISIBILITY_THRESHOLD) continue;

      const p = toScreen(lm);

      ctx.beginPath();
      ctx.arc(p.x, p.y, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = SCORE_COLORS.excellent;
      ctx.fill();

      // White border for visibility
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [landmarks, width, height, isMirrored, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 h-full w-full"
      style={{
        pointerEvents: 'none',
      }}
    />
  );
}
