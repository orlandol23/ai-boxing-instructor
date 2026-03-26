import { useNavigate } from 'react-router-dom';
import { Swords, Target, Dumbbell } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      {/* Logo / Title */}
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-wider text-boxing-gold">
          BOXING AI
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Seu instrutor virtual de boxe
        </p>
      </div>

      {/* Main CTA */}
      <button
        onClick={() => navigate('/training')}
        className="flex w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-boxing-red py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-boxing-red-light"
      >
        <Swords size={24} />
        Iniciar Treino
      </button>

      {/* Mode cards */}
      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        <ModeCard
          icon={<Target size={22} />}
          title="Shadow Boxing"
          description="Treino livre"
          onClick={() => navigate('/training')}
        />
        <ModeCard
          icon={<Dumbbell size={22} />}
          title="Técnica"
          description="Drill focado"
          disabled
        />
      </div>

      <p className="text-xs text-gray-500">
        Posicione o celular num tripé a ~2m de distância
      </p>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 rounded-lg border border-boxing-border bg-boxing-card p-4 text-center transition-colors hover:border-boxing-gold/50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="text-boxing-gold">{icon}</div>
      <span className="text-sm font-bold">{title}</span>
      <span className="text-xs text-gray-400">{description}</span>
    </button>
  );
}
