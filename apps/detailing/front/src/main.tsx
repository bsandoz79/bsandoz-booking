import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@bsandoz/ui';
import { App } from './app/App';
import './index.css';
import { enregistrerServiceWorker } from './pwa/serviceWorker';
import { ecouterInstallation } from './pwa/installation';

// Avant l'affichage : le navigateur n'envoie l'invitation d'installation qu'une fois.
ecouterInstallation();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

enregistrerServiceWorker();
