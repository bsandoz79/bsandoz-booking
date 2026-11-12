import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { defilerVers } from './defilement';

/**
 * Liens vers une section (« /#fidelite ») : la page défile jusqu'à la section, même si elle s'affiche un peu après
 * (contenu chargé depuis l'API). Abandon au bout de 3 secondes si la section n'existe pas.
 */
export function DefilementAncre() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    return defilerVers(decodeURIComponent(hash.slice(1)));
  }, [pathname, hash]);
  return null;
}
