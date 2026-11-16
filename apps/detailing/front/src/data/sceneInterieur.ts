/**
 * Scène « l'intérieur, avant et après », juste après la vidéo de l'accueil (images créées par IA).
 * La section reste à l'écran pendant qu'on fait défiler : les images glissent vers la gauche, une par une, chacune avec son
 * grand titre. Pour changer une image : remplacer le fichier dans `public/scenes/` (même nom).
 */
export const SCENE_INTERIEUR = {
  titre: 'L’intérieur, avant et après',
  /** Hauteur de défilement de la scène, en hauteurs d'écran (plus grand : les images glissent plus lentement). */
  ecrans: 4,
  images: [
    { src: '/scenes/interieur-avant-porte.jpg', alt: 'Portière ouverte : sièges et tapis salis, déchets sur le plancher.', texte: 'Avant.' },
    { src: '/scenes/interieur-avant.jpg', alt: 'Habitacle vu de l’arrière : tableau de bord poussiéreux, emballages et papiers entre les sièges.', texte: 'Miettes, poussière,\ndéchets.' },
    { src: '/scenes/interieur-apres.jpg', alt: 'Le même habitacle nettoyé : tableau de bord, sièges et tapis propres.', texte: 'Après.' },
    { src: '/scenes/interieur-apres-porte.jpg', alt: 'Portière ouverte : sièges et plancher propres.', texte: 'Comme au\npremier jour.' },
  ],
} as const;

/**
 * Image affichée pour un avancement du défilement (0 → 1) : chaque image occupe une part égale du parcours.
 * Sert au titre visible et à l'annonce pour les lecteurs d'écran.
 */
export function imageCourante(avance: number, nombre: number): number {
  return Math.min(nombre - 1, Math.max(0, Math.round(avance * (nombre - 1))));
}
