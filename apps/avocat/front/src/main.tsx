import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../packages/ui/src/styles/tokens.css';
import './index.css';
import { App } from './App';
import { confidentialite, mentionsLegales } from './data/legal';
import { PageLegale } from './pages/PageLegale';

/** Pages du site, toutes servies par index.html (voir public/.htaccess). */
const chemin = window.location.pathname.replace(/\/$/, '');
const page =
  chemin === '/mentions-legales' ? <PageLegale page={mentionsLegales} />
  : chemin === '/confidentialite' ? <PageLegale page={confidentialite} />
  : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
