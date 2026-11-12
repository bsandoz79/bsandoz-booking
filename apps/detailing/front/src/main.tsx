import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@bsandoz/ui';
import { App } from './app/App';
import './index.css';
import { enregistrerServiceWorker } from './pwa/serviceWorker';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

enregistrerServiceWorker();
