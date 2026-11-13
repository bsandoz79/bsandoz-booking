import { createContext, useContext } from 'react';

export interface ModeEdition {
  /** Le visiteur est le pro connecté : il peut passer en mode modification. */
  peutModifier: boolean;
  /** Pro connecté : les crayons sont affichés sur le site. */
  actif: boolean;
  basculer: () => void;
}

export const ContexteModeEdition = createContext<ModeEdition>({ peutModifier: false, actif: false, basculer: () => undefined });

export const useModeEdition = () => useContext(ContexteModeEdition);
