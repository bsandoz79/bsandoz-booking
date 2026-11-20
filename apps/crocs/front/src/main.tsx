import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../packages/ui/src/styles/tokens.css';
import './index.css';
import { App } from './App';
import { EspacePro } from './pages/EspacePro';
import { MentionsLegales } from './pages/MentionsLegales';

/** Pages du site, toutes servies par index.html (voir public/.htaccess). */
const chemin = window.location.pathname.replace(/\/$/, '');
const page = chemin === '/pro' ? <EspacePro /> : chemin === '/mentions-legales' ? <MentionsLegales /> : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
