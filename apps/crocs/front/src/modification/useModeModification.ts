import { useCallback, useEffect, useState } from 'react';
import { carteApi, deconnecter, lireCartePro, reprendreSession, type RubriqueApi } from '../services/api';
import { inactifTropLongtemps, oublierActivite, useInactivite } from '../pages/pro/inactivite';

/** Adresse du site en mode modification (ouverte depuis l'espace pro). */
export const ADRESSE_MODIFICATION = '/?modifier';

export const demandeModification = (recherche = window.location.search) => new URLSearchParams(recherche).has('modifier');

type Etat = 'verification' | 'actif' | 'inactif';

export interface ModeModification {
  /** Le patron est connecté : les éléments du site sont entourés et se touchent pour être modifiés. */
  actif: boolean;
  verification: boolean;
  /** Carte complète du patron (avec les plats cachés), relue après chaque changement. */
  carte?: RubriqueApi[];
  rechargerCarte: () => Promise<void>;
  /** Chaque action sur la carte : enregistrée tout de suite, puis la carte est relue. */
  actionsCarte: typeof carteApi;
}

/** Retour à l'espace pro (connexion), par exemple après 30 minutes sans activité. Objet modifiable pour les tests. */
export const navigation = { versEspacePro: () => window.location.replace('/pro') };

/**
 * Mode modification du site : demandé par `?modifier`, accordé seulement si la session du patron est encore ouverte
 * (sinon, direction l'espace pro pour se connecter). Même règle que l'espace pro : déconnexion après 30 minutes sans activité.
 */
export function useModeModification(demande: boolean, rechargerSite: () => Promise<void>): ModeModification {
  const [etat, setEtat] = useState<Etat>(demande ? 'verification' : 'inactif');
  const [carte, setCarte] = useState<RubriqueApi[]>();

  const expire = useCallback(() => {
    oublierActivite();
    void deconnecter().finally(() => navigation.versEspacePro());
  }, []);
  useInactivite(etat === 'actif', expire);

  const rechargerCarte = useCallback(async () => setCarte(await lireCartePro()), []);

  useEffect(() => {
    if (!demande) return;
    if (inactifTropLongtemps()) {
      expire();
      return;
    }
    void reprendreSession().then(async (ok) => {
      if (!ok) {
        navigation.versEspacePro();
        return;
      }
      setEtat('actif');
      await rechargerCarte().catch(() => undefined);
    });
  }, [demande, expire, rechargerCarte]);

  // Chaque action relit la carte du patron et celle du site (prix barré, « Nouveau », plats cachés…).
  const puisRelire = <A extends unknown[]>(action: (...args: A) => Promise<void>) => async (...args: A) => {
    await action(...args);
    await Promise.all([rechargerCarte(), rechargerSite()]);
  };
  const actionsCarte = Object.fromEntries(
    Object.entries(carteApi).map(([nom, action]) => [nom, puisRelire(action as (...args: unknown[]) => Promise<void>)]),
  ) as unknown as typeof carteApi;

  return { actif: etat === 'actif', verification: etat === 'verification', carte, rechargerCarte, actionsCarte };
}
