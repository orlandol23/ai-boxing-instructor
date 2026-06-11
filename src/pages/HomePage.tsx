import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Target, Dumbbell } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      {/* Logo / Title */}
      <div className="text-center">
        <h1 className="font-display text-display font-extrabold uppercase tracking-wide text-accent">
          Boxing AI
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Seu instrutor virtual de boxe
        </p>
      </div>

      {/* Main CTA — Button primary xl (SPECS §6) */}
      <button
        type="button"
        onClick={() => navigate('/training')}
        className="flex min-h-16 w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-primary px-9 font-display text-[22px] font-bold uppercase tracking-wider text-on-primary transition-[background-color,transform] [box-shadow:var(--glow-primary)] hover:bg-primary-hover active:scale-[.96] active:bg-primary-pressed"
      >
        <Swords size={24} aria-hidden="true" />
        Iniciar treino
      </button>

      {/* Mode cards */}
      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        <ModeCard
          icon={<Target size={24} aria-hidden="true" />}
          title="Shadow"
          description="Treino livre"
          onClick={() => navigate('/training')}
        />
        <ModeCard
          icon={<Dumbbell size={24} aria-hidden="true" />}
          title="Técnica"
          description="Em breve"
          disabled
        />
      </div>

      <p className="text-xs text-fg-dim">
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
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-4 text-center transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="text-accent">{icon}</div>
      <span className="font-display text-base font-bold uppercase tracking-wide text-fg">
        {title}
      </span>
      <span className="text-xs text-fg-muted">{description}</span>
    </button>
  );
}
