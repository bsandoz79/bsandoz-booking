import { useCallback, useEffect, useRef, useState } from 'react';
import type { RubriqueCarte } from '@bsandoz/ui';
import { avis as avisIntegres, carte as carteIntegree, crocs, photos as photosIntegrees } from '../data/crocs';
import { urlPicto } from '../data/pictos';
import { avecApi, lireCartePublique, lireContenu, type AvisSite, type Horaire, type PhotoSite, type RubriqueApi } from '../services/api';

export interface Contenu {
  carte: RubriqueCarte[];
  accroche: string;
  horaires: Horaire[];
  /** Horaires venant encore des annuaires (pas encore donnés par le patron). */
  horairesAConfirmer: boolean;
  annonce: string;
  avis: AvisSite[];
  photos: PhotoSite[];
  /** Première visite : la réponse de l'API n'est pas encore là (rien n'est montré plutôt qu'un contenu qui changerait). */
  enAttente: boolean;
}

export interface ContenuCharge extends Contenu {
  /** Relit l'API (après une modification faite sur le site par le patron). */
  recharger: () => Promise<void>;
}

/** Dernier contenu reçu de l'API, gardé sur l'appareil : affiché tout de suite à la visite suivante. */
const CLE_CACHE = 'crocs-contenu-v1';
/** Au-delà, l'API est jugée injoignable : le site montre son contenu intégré. */
export const ATTENTE_MAX = 2500;

function lireCache(): Contenu | null {
  try {
    const brut = localStorage.getItem(CLE_CACHE);
    return brut ? { ...(JSON.parse(brut) as Contenu), enAttente: false } : null;
  } catch {
    return null;
  }
}

function ecrireCache(c: Contenu) {
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify({ ...c, enAttente: false }));
  } catch {
    /* stockage plein ou interdit : tant pis, le site recharge depuis l'API */
  }
}

const INTEGRE: Contenu = {
  carte: carteIntegree, accroche: crocs.accroche, horaires: crocs.horaires, horairesAConfirmer: crocs.horairesAConfirmer, annonce: '',
  avis: avisIntegres, photos: photosIntegrees, enAttente: false,
};

/** Carte de l'API → carte affichée (pictogramme : clé → dessin). */
export const versCarte = (rubriques: RubriqueApi[]): RubriqueCarte[] =>
  rubriques.map((r) => ({ id: r.id, nom: r.nom, note: r.note || undefined, pictogramme: urlPicto(r.icone), articles: r.articles }));

/**
 * Contenu du site : la carte et les textes modifiés par le patron (API), sinon ceux intégrés au site.
 * Pas de clignotement au chargement : le dernier contenu reçu est affiché tout de suite (cache sur l'appareil) ;
 * à la première visite, on attend l'API (au plus `ATTENTE_MAX`) au lieu de montrer d'abord le contenu intégré.
 * Si l'API ne répond pas, le site reste utilisable avec la carte intégrée.
 */
export function useContenu(): ContenuCharge {
  const [contenu, setContenu] = useState<Contenu>(() => (avecApi() ? lireCache() ?? { ...INTEGRE, enAttente: true } : INTEGRE));
  const actif = useRef(true);

  const charger = useCallback(async () => {
    const [carte, site] = await Promise.allSettled([lireCartePublique(), lireContenu()]);
    if (!actif.current) return;
    setContenu(() => {
      // Toujours à partir du contenu intégré : ce que le patron a retiré ne reste pas depuis le cache.
      const suite = { ...INTEGRE };
      if (carte.status === 'fulfilled' && carte.value.length > 0) suite.carte = versCarte(carte.value);
      if (site.status === 'fulfilled') {
        const c = site.value;
        if (c.accroche?.trim()) suite.accroche = c.accroche;
        if (c.horaires && c.horaires.length > 0) { suite.horaires = c.horaires; suite.horairesAConfirmer = false; }
        suite.annonce = c.annonce?.trim() ?? '';
        // Listes données par le patron (même vides : il a pu tout retirer).
        if (Array.isArray(c.avis)) suite.avis = c.avis;
        if (Array.isArray(c.photos)) suite.photos = c.photos;
      }
      if (carte.status === 'fulfilled' || site.status === 'fulfilled') ecrireCache(suite);
      return suite;
    });
  }, []);

  useEffect(() => {
    if (!avecApi()) return;
    actif.current = true;
    const secours = window.setTimeout(() => { if (actif.current) setContenu((c) => (c.enAttente ? { ...c, enAttente: false } : c)); }, ATTENTE_MAX);
    void charger().then(() => window.clearTimeout(secours));
    return () => { actif.current = false; window.clearTimeout(secours); };
  }, [charger]);

  return { ...contenu, recharger: charger };
}
