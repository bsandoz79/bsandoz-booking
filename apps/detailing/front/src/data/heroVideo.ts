/**
 * Haut de l'accueil piloté par le défilement : la vidéo avance image par image au fil du défilement, des titres
 * s'enchaînent par étape, puis le texte de l'accueil et le panneau « Réserver » arrivent.
 *
 * Pour changer de vidéo : remplacer les fichiers (mêmes noms) puis ajuster les étapes (début et fin en part de la
 * vidéo, de 0 à 1). Vidéo à encoder avec des images clés très rapprochées (voir docs/video-ia.md), sinon l'image saute.
 */
export const HERO_VIDEO = {
  src: '/defilement/lavage.mp4',
  /** Première image (affichée pendant le chargement) et dernière image (« moins d'animations »). */
  debut: '/defilement/lavage-debut.jpg',
  fin: '/defilement/lavage-fin.jpg',
  /** Hauteur de défilement de la scène, en hauteurs d'écran (plus grand : la vidéo avance plus lentement). */
  ecrans: 4,
  /** Titres affichés en grand pendant certaines parties de la vidéo. */
  etapes: [
    { de: 0, a: 0.22, texte: 'Faites défiler\npour nettoyer.' },
    { de: 0.3, a: 0.52, texte: 'Regardez\nde plus près.' },
    { de: 0.6, a: 0.8, texte: 'Le détail\nfait tout.' },
  ],
  /** Part du défilement à partir de laquelle le texte de l'accueil et le panneau « Réserver » arrivent. */
  final: 0.86,
};
