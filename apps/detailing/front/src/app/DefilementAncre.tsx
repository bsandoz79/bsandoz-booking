import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Liens vers une section (« /#fidelite ») : la page défile jusqu'à la section, même si elle s'affiche un peu après
 * (contenu chargé depuis l'API). Abandon au bout de 3 secondes si la section n'existe pas.
 */
export function DefilementAncre() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let essais = 0;
    const minuterie = window.setInterval(() => {
      const cible = document.getElementById(id);
      if (cible) { cible.scrollIntoView?.({ behavior: reduit ? 'auto' : 'smooth', block: 'start' }); window.clearInterval(minuterie); }
      else if (++essais > 30) window.clearInterval(minuterie);
    }, 100);
    return () => window.clearInterval(minuterie);
  }, [pathname, hash]);
  return null;
}
