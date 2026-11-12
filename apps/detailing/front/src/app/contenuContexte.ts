import { createContext, useContext } from 'react';
import { CONTENU_PAR_DEFAUT, type ContenuSite } from '../services/contenu';

export interface ValeurContenu {
  contenu: ContenuSite;
  /** Remplace le contenu affiché (après un enregistrement dans l'espace pro). */
  remplacer: (contenu: ContenuSite) => void;
}

/** Contenu modifiable du site ; sans fournisseur (tests d'une page seule), textes par défaut. */
export const ContexteContenu = createContext<ValeurContenu>({ contenu: CONTENU_PAR_DEFAUT, remplacer: () => undefined });

export const useContenu = () => useContext(ContexteContenu);
