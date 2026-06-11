import { SwitchCamera } from 'lucide-react';

interface CameraControlsProps {
  onToggleCamera: () => void;
  fps: number;
}

export function CameraControls({ onToggleCamera, fps }: CameraControlsProps) {
  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2.5">
      <span className="num rounded-md bg-overlay px-2.5 py-1 text-xs font-bold text-white/80 backdrop-blur-xs">
        {fps} FPS
      </span>
      <button
        type="button"
        onClick={onToggleCamera}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay text-white backdrop-blur-xs transition-colors hover:bg-surface-2 active:bg-primary active:text-on-primary"
        aria-label="Alternar câmera"
      >
        <SwitchCamera size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
