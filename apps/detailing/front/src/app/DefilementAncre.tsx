import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { defilerVers } from './defilement';

/**
 * Défilement à chaque navigation :
 * - lien vers une section (« /#fidelite ») : la page défile jusqu'à la section, même si elle s'affiche un peu après
 *   (contenu chargé depuis l'API) ; abandon au bout de 3 secondes si la section n'existe pas ;
 * - sinon, retour tout en haut de la page, y compris en recliquant sur le lien de la page déjà ouverte ;
 * - bouton « Retour » du navigateur : le navigateur remet lui-même la page où elle était.
 */
export function DefilementAncre() {
  const { pathname, hash, key } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (hash) return defilerVers(decodeURIComponent(hash.slice(1)));
    if (type !== 'POP') window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    return undefined;
  }, [pathname, hash, key, type]);
  return null;
}
