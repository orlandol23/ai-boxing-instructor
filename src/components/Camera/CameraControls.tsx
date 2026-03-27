import { SwitchCamera } from 'lucide-react';

interface CameraControlsProps {
  onToggleCamera: () => void;
  fps: number;
}

export function CameraControls({ onToggleCamera, fps }: CameraControlsProps) {
  return (
    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
      <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-mono text-white">
        {fps} FPS
      </span>
      <button
        type="button"
        onClick={onToggleCamera}
        className="rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80 active:bg-boxing-red"
        aria-label="Alternar câmera"
      >
        <SwitchCamera size={20} />
      </button>
    </div>
  );
}
