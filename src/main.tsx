import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { activeProfileOf, createProfileStore } from './services/profileStore';
import { setTheme } from './theme/theme';

// i18n: English by default, PT-BR detected from the browser. Resources are
// bundled (not fetched) so the PWA renders text offline.
import './i18n';

// Self-hosted fonts (@fontsource), bundled by Vite and pre-cached by the
// PWA service worker, so they work offline (SPECS §8.5).
import '@fontsource/saira/400.css';
import '@fontsource/saira/500.css';
import '@fontsource/saira/600.css';
import '@fontsource/saira-condensed/700.css';
import '@fontsource/saira-condensed/800.css';

import './styles/globals.css';

// Theme of the last active profile (F7). The inline script in index.html
// already applied it before the first paint; re-applying here keeps
// index.html and the app consistent even if the inline script is
// removed or fails.
const bootProfile = activeProfileOf(createProfileStore().load());
setTheme(bootProfile?.isKid ? 'kids' : 'adult');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
