import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../packages/ui/src/styles/tokens.css';
import './index.css';
import { App } from './App';
import { EspacePro } from './pages/EspacePro';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Espace du patron : /pro (même site, servi par index.html). */}
    {window.location.pathname.replace(/\/$/, '') === '/pro' ? <EspacePro /> : <App />}
  </StrictMode>,
);
