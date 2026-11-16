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
    { de: 0, a: 0.08, texte: 'Faites défiler\npour nettoyer.' },
    { de: 0.12, a: 0.32, texte: 'On applique\nla mousse.' },
    { de: 0.38, a: 0.58, texte: 'On rince.' },
    { de: 0.62, a: 0.76, texte: 'Regardez\nde plus près.' },
  ],
  /** Part du défilement à partir de laquelle le texte de l'accueil et le panneau « Réserver » arrivent. */
  final: 0.86,
} as const;
