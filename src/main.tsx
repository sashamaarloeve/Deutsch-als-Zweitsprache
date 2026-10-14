import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/patrick-hand/latin-400.css';
import '@fontsource/patrick-hand/latin-ext-400.css';
import './styles.css';
import { App } from './App';
import { applyPrefs, defaultPrefs } from './logic/prefs';

applyPrefs(defaultPrefs()); // before the first paint, so there is no flash

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline use: only in the real build, not while developing.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* the app works without it */
    });
  });
}
