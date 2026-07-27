import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { activeProfileOf, createProfileStore } from './services/profileStore';
import { setTheme } from './theme/theme';

// i18n: English by default, PT-BR detected from the browser. Resources are
// bundled (not fetched) so the PWA renders text offline.
import './i18n';

// Fontes self-hosted (@fontsource) — empacotadas pelo Vite e pré-cacheadas
// pelo service worker do PWA, funcionam offline (SPECS §8.5).
import '@fontsource/saira/400.css';
import '@fontsource/saira/500.css';
import '@fontsource/saira/600.css';
import '@fontsource/saira-condensed/700.css';
import '@fontsource/saira-condensed/800.css';

import './styles/globals.css';

// Tema do último perfil ativo (F7). O script inline no index.html já
// aplicou antes do primeiro paint; reaplicar aqui mantém index.html e
// app consistentes mesmo se o inline for removido/falhar.
const bootProfile = activeProfileOf(createProfileStore().load());
setTheme(bootProfile?.isKid ? 'kids' : 'adult');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
