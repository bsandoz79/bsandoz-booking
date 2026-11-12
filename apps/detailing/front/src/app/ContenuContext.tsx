import { useEffect, useState, type ReactNode } from 'react';
import { CONTENU_PAR_DEFAUT, chargerContenu, type ContenuSite } from '../services/contenu';
import { ContexteContenu } from './contenuContexte';

/** Charge le contenu modifiable du site une fois ; textes par défaut en attendant ou si l'API ne répond pas. */
export function ContenuProvider({ children }: { children: ReactNode }) {
  const [contenu, setContenu] = useState<ContenuSite>(CONTENU_PAR_DEFAUT);
  useEffect(() => { chargerContenu().then(setContenu).catch(() => undefined); }, []);
  return <ContexteContenu.Provider value={{ contenu, remplacer: setContenu }}>{children}</ContexteContenu.Provider>;
}
