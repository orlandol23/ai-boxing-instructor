import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="flex h-12 items-center justify-between bg-boxing-card px-4 border-b border-boxing-border">
      {isHome ? (
        <span className="font-display text-lg font-bold tracking-wide text-boxing-gold">
          BOXING AI
        </span>
      ) : (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      )}

      <button
        className="text-gray-400 cursor-default"
        aria-label="Configurações"
        disabled
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
