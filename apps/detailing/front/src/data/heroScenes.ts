/**
 * Haut de l'accueil piloté par le défilement, en images (créées par IA) : voiture boueuse → la mousse coule dessus →
 * une barre de lumière la rince de gauche à droite → on se rapproche de la voiture propre → porte du garage, lumière
 * dorée, puis le texte et le panneau « Réserver ».
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
    mousse: [0.08, 0.3],
    rincage: [0.36, 0.6],
    zoom: [0.6, 0.76],
    garage: [0.76, 0.86],
  },
  /** Titres affichés en grand pendant certaines parties du défilement. */
  etapes: [
    { de: 0, a: 0.08, texte: 'Avant.' },
    { de: 0.12, a: 0.32, texte: 'On applique\nla mousse.' },
    { de: 0.38, a: 0.58, texte: 'On rince.' },
    { de: 0.62, a: 0.76, texte: 'Regardez\nde plus près.' },
  ],
  /** Part du défilement à partir de laquelle le texte de l'accueil et le panneau « Réserver » arrivent. */
  final: 0.86,
  /**
   * Lecture automatique à l'arrivée : points de passage [seconde, avancement], la page défile toute seule entre eux.
   * Les paliers laissent le temps de voir chaque image et de lire chaque titre (environ 15 s en tout).
   */
  lecture: [
    // boue (pause), mousse qui coule (3 s), pause, rinçage (3 s), pause, rapprochement (2 s), pause, garage puis texte.
    [0, 0], [1.8, 0.04], [2.2, 0.08], [5.2, 0.3], [6.4, 0.34], [6.8, 0.36], [9.8, 0.6], [11, 0.62], [13, 0.76], [13.8, 0.78], [15.3, 0.9],
  ] as ReadonlyArray<readonly [number, number]>,
  /** Attente avant le départ, le temps que la première image s'affiche (millisecondes). */
  attenteMs: 600,
} as const;
