import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrazione e auto-aggiornamento immediato PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nuova versione disponibile, aggiorno...');
    window.location.reload();
  },
  onOfflineReady() {
    console.log('Spes Montesacro pronto per uso offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
