import { useEffect, useState, type ReactNode } from 'react';
import { ContexteModeEdition as Contexte } from './modeEditionContexte';
import { estConnecte, reprendreSession, rolesSession } from '../services/compte';

/** Mode « Modifier » du site public, réservé au pro connecté. */
export function ModeEditionProvider({ children }: { children: ReactNode }) {
  const [peutModifier, setPeutModifier] = useState(false);
  const [actif, setActif] = useState(false);

  useEffect(() => {
    let annule = false;
    (estConnecte() ? Promise.resolve(true) : reprendreSession())
      .then((ok) => { if (!annule) setPeutModifier(ok && rolesSession().includes('ROLE_PRO')); })
      .catch(() => undefined);
    return () => { annule = true; };
  }, []);

  return (
    <Contexte.Provider value={{ peutModifier, actif: peutModifier && actif, basculer: () => setActif((a) => !a) }}>
      {children}
    </Contexte.Provider>
  );
}
