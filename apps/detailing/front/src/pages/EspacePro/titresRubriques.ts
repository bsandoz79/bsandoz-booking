/** Rubriques du contenu du site, modifiables dans « Mon site » ou directement sur le site (mode « Modifier »). */
export type RubriqueSite = 'coordonnees' | 'accueil' | 'photo' | 'etapes' | 'realisations' | 'avis' | 'faq' | 'communes' | 'legal';

export const TITRES_RUBRIQUES: Record<RubriqueSite, string> = {
  coordonnees: 'Coordonnées',
  accueil: 'Haut de la page d’accueil',
  photo: 'Photo de l’accueil',
  etapes: 'Comment ça marche (étapes)',
  realisations: 'Réalisations (photos avant / après)',
  avis: 'Avis clients',
  faq: 'Questions fréquentes',
  communes: 'Communes desservies',
  legal: 'Informations légales',
};
