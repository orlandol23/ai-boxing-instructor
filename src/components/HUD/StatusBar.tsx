interface StatusBarProps {
  isModelLoading: boolean;
  hasLandmarks: boolean;
  error: string | null;
}

export function StatusBar({ isModelLoading, hasLandmarks, error }: StatusBarProps) {
  if (error) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-score-bad/90 px-4 py-2 text-center text-sm text-white">
        {error}
      </div>
    );
  }

  if (isModelLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-boxing-gold border-t-transparent" />
        <p className="mt-4 text-boxing-gold-light font-display text-lg">
          Carregando modelo de pose...
        </p>
      </div>
    );
  }

  if (!hasLandmarks) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-boxing-card/90 px-4 py-2 text-center text-sm text-score-warn">
        Posicione-se na frente da câmera
      </div>
    );
  }

  return null;
}
