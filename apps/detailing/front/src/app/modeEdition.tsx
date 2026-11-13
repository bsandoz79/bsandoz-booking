import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ContexteModeEdition as Contexte } from './modeEditionContexte';
import { estConnecte, reprendreSession, rolesSession } from '../services/compte';

const estPro = () => estConnecte() && rolesSession().includes('ROLE_PRO');
/** Reprise de session (cookie) tentée une seule fois par visite. */
let repriseTentee = false;

/**
 * Mode « Modifier » du site public : actif d'office pour le pro connecté (crayons affichés partout), jamais pour
 * les visiteurs. Revérifié à chaque changement de page (connexion ou déconnexion dans l'espace pro).
 */
export function ModeEditionProvider({ children }: { children: ReactNode }) {
  // Rendu à chaque changement de page : l'état de la session est relu ; une session à reprendre (cookie) relance un rendu.
  const { pathname } = useLocation();
  const [, setReprise] = useState(0);
  useEffect(() => {
    let annule = false;
    if (!estConnecte() && !repriseTentee) {
      repriseTentee = true;
      reprendreSession().then((ok) => { if (ok && !annule) setReprise((n) => n + 1); }).catch(() => undefined);
    }
    return () => { annule = true; };
  }, [pathname]);
  const pro = estPro();

  return <Contexte.Provider value={{ peutModifier: pro, actif: pro, basculer: () => undefined }}>{children}</Contexte.Provider>;
}
