/**
 * Haut de l'accueil piloté par le défilement, en images (créées par IA) : voiture boueuse → la mousse coule dessus →
 * une barre de lumière la rince de gauche à droite → porte du garage, lumière dorée, puis le texte et le panneau
 * « Réserver ». Les 3 premières images sont recadrées pour que la voiture soit au même endroit, à la même taille ; l'image
 * du garage arrive avec ce même cadrage puis recule doucement jusqu'à son cadrage d'origine (image entière).
 *
 * Chaque moment est une part du défilement (de 0 à 1). Pour changer une image : remplacer le fichier (même nom).
 */
export const HERO_SCENES = {
  images: {
    boue: '/scenes/boue.jpg',
    mousse: '/scenes/mousse.jpg',
    propre: '/scenes/propre.jpg',
    garage: '/scenes/garage.jpg',
  },
  /** Hauteur de défilement de la scène, en hauteurs d'écran (plus grand : tout avance plus lentement). */
  ecrans: 5,
  moments: {
    mousse: [0.08, 0.35],
    rincage: [0.42, 0.7],
    garage: [0.74, 0.84],
    /** Recul progressif sur l'image du garage, jusqu'à son cadrage d'origine (image entière). */
    recul: [0.78, 0.97],
  },
  /** Titres affichés en grand pendant certaines parties du défilement. */
  etapes: [
    { de: 0, a: 0.08, texte: 'Avant.' },
    { de: 0.12, a: 0.37, texte: 'On applique\nla mousse.' },
    { de: 0.42, a: 0.7, texte: 'On rince.' },
  ],
  /** Part du défilement à partir de laquelle le texte de l'accueil et le panneau « Réserver » arrivent. */
  final: 0.86,
  /** Part du défilement à laquelle la scène est terminée : elle se fige sur l'image finale (plus de retour en arrière). */
  fin: 0.97,
  /**
   * Lecture automatique à l'arrivée : points de passage [seconde, avancement], la page défile toute seule entre eux.
   * Environ 6 s en tout, d'un seul mouvement fluide.
   */
  lecture: [
    // boue, mousse qui coule, rinçage, garage puis texte.
    [0, 0], [0.6, 0.05], [2.2, 0.36], [3.9, 0.7], [5, 0.84], [6.2, 0.97],
  ] as ReadonlyArray<readonly [number, number]>,
  /** Attente avant le départ, le temps que la première image s'affiche (millisecondes). */
  attenteMs: 300,
} as const;
