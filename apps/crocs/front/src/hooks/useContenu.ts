import { useEffect, useState } from 'react';
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
}

const INTEGRE: Contenu = {
  carte: carteIntegree, accroche: crocs.accroche, horaires: crocs.horaires, horairesAConfirmer: crocs.horairesAConfirmer, annonce: '',
  avis: avisIntegres, photos: photosIntegrees,
};

/** Carte de l'API → carte affichée (pictogramme : clé → dessin). */
export const versCarte = (rubriques: RubriqueApi[]): RubriqueCarte[] =>
  rubriques.map((r) => ({ id: r.id, nom: r.nom, note: r.note || undefined, pictogramme: urlPicto(r.icone), articles: r.articles }));

/**
 * Contenu du site : la carte et les textes modifiés par le patron (API), sinon ceux intégrés au site.
 * Si l'API ne répond pas, le site reste utilisable avec la carte intégrée.
 */
export function useContenu(): Contenu {
  const [contenu, setContenu] = useState<Contenu>(INTEGRE);

  useEffect(() => {
    if (!avecApi()) return;
    let actif = true;
    void Promise.allSettled([lireCartePublique(), lireContenu()]).then(([carte, site]) => {
      if (!actif) return;
      setContenu((avant) => {
        const suite = { ...avant };
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
        return suite;
      });
    });
    return () => { actif = false; };
  }, []);

  return contenu;
}
