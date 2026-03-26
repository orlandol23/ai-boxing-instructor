import { useEffect, useRef } from 'react';
import type { Landmark } from '../../engine/types';
import type { FacingMode } from '../../hooks/useCamera';
import { SKELETON_CONNECTIONS, SCORE_COLORS } from '../../engine/constants';

interface PoseCanvasProps {
  landmarks: Landmark[] | null;
  width: number;
  height: number;
  facingMode: FacingMode;
}

const JOINT_RADIUS = 5;
const LINE_WIDTH = 3;

export function PoseCanvas({ landmarks, width, height, facingMode }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMirrored = facingMode === 'user';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    // Helper to get screen coordinates
    const toScreen = (lm: Landmark) => ({
      x: isMirrored ? (1 - lm.x) * width : lm.x * width,
      y: lm.y * height,
    });

    // Draw connections
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = SCORE_COLORS.excellent;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start.visibility < 0.5 || end.visibility < 0.5) continue;

      const p1 = toScreen(start);
      const p2 = toScreen(end);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw joints
    for (const lm of landmarks) {
      if (lm.visibility < 0.5) continue;

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
  }, [landmarks, width, height, isMirrored]);

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
