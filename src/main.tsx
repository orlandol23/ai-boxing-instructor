import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DEFAULT_THEME, setTheme } from './theme/theme';

// Fontes self-hosted (@fontsource) — empacotadas pelo Vite e pré-cacheadas
// pelo service worker do PWA, funcionam offline (SPECS §8.5).
import '@fontsource/saira/400.css';
import '@fontsource/saira/500.css';
import '@fontsource/saira/600.css';
import '@fontsource/saira-condensed/700.css';
import '@fontsource/saira-condensed/800.css';

import './styles/globals.css';

// Tema Fight Night (adult) no boot; o tema kids é ativado pelo seletor
// de perfis (Fase 7) via setTheme('kids').
setTheme(DEFAULT_THEME);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
