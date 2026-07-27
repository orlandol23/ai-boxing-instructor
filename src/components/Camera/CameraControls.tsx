import { SwitchCamera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CameraControlsProps {
  onToggleCamera: () => void;
  fps: number;
}

export function CameraControls({ onToggleCamera, fps }: CameraControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2.5">
      <span className="num rounded-md bg-overlay px-2.5 py-1 text-xs font-bold text-white/80 backdrop-blur-xs">
        {fps} FPS
      </span>
      <button
        type="button"
        onClick={onToggleCamera}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay text-white backdrop-blur-xs transition-colors hover:bg-surface-2 active:bg-primary active:text-on-primary"
        aria-label={t('camera.switch')}
      >
        <SwitchCamera size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
