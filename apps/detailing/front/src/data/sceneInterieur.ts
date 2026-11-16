/**
 * Scène « l'intérieur, avant et après », juste après la vidéo de l'accueil (images créées par IA), pilotée par le défilement :
 * 1. approche : portière sale, la vue avance par l'ouverture jusqu'à l'habitacle sale ;
 * 2. arrêt : le défilement s'arrête, la souris devient un chiffon et nettoie l'habitacle là où elle passe ;
 * 3. là où le chiffon n'est pas passé, ça reste sale. Un coup de molette vers le bas (ou « Passer ») :
 *    le chiffon finit tout seul, en allers-retours de droite à gauche comme sur une vitre, puis la vue ressort par la portière,
 *    propre cette fois ;
 * 4. en remontant, le chemin se rejoue à l'envers et l'habitacle se resalit.
 * Chaque moment est une part du défilement de la section (de 0 à 1). Pour changer une image : remplacer le fichier (même nom).
 */
export const SCENE_INTERIEUR = {
  titre: 'L’intérieur, avant et après',
  /** Hauteur de défilement de la scène, en hauteurs d'écran (plus grand : tout avance plus lentement). */
  ecrans: 5,
  images: {
    porteSale: { src: '/scenes/interieur-avant-porte.jpg', alt: 'Portière ouverte : sièges et tapis salis, déchets sur le plancher.' },
    habitacleSale: { src: '/scenes/interieur-avant.jpg', alt: 'L’habitacle sale : tableau de bord poussiéreux, emballages et papiers entre les sièges.' },
    habitaclePropre: { src: '/scenes/interieur-apres.jpg', alt: 'Le même habitacle nettoyé : tableau de bord, sièges et tapis propres.' },
    portePropre: { src: '/scenes/interieur-apres-porte.jpg', alt: 'Portière ouverte : sièges et plancher propres.' },
  },
  /** Curseur « chiffon » pendant le nettoyage (point actif au centre). */
  chiffon: '/scenes/chiffon.png',
  /** Point de l'image de la portière vers lequel on avance (l'ouverture, au niveau du volant), et grossissement final. */
  origine: '54% 42%',
  zoom: 2.8,
  moments: {
    /** Avance vers l'ouverture de la portière. */
    approche: [0, 0.4] as const,
    /** Passage de la portière à l'habitacle (fondu), en fin d'approche. */
    entree: [0.26, 0.4] as const,
    /** Arrêt dans l'habitacle : le nettoyage à la souris. */
    arret: 0.45,
    /** Sortie par la portière, véhicule propre. */
    sortie: [0.5, 0.95] as const,
    /** Passage de l'habitacle propre à la portière propre (fondu), en début de sortie. */
    sortieFondu: [0.5, 0.64] as const,
  },
  textes: {
    approche: 'Avant.',
    arret: 'À vous :\npassez le chiffon.',
    aide: 'Frottez l’habitacle pour le nettoyer.',
    continuer: 'Passer',
    sortie: 'Comme au\npremier jour.',
  },
  /** Taille du chiffon, en part du plus petit côté de l'image. */
  rayonChiffon: 0.08,
  /** Durée de la fin du nettoyage, puis de la sortie jouée toute seule (millisecondes). */
  finNettoyageMs: 2200,
  sortieMs: 1800,
  /** Pause minimale avant un nouveau coup de molette (ms) : l'élan du défilement ne finit pas le nettoyage tout seul. */
  pauseMoletteMs: 300,
} as const;

const entre = (p: number, [debut, fin]: readonly [number, number]) => Math.min(1, Math.max(0, (p - debut) / (fin - debut)));
const adoucir = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Ce qu'affiche la scène pour un avancement du défilement (0 → 1). Fonction pure, testée. */
export function etatScene(p: number) {
  const { moments, zoom } = SCENE_INTERIEUR;
  // Au point d'arrêt même, l'habitacle est encore sale : c'est le chiffon qui le nettoie.
  const propre = p > moments.arret;
  if (!propre) {
    // Approche : la portière grossit vers l'ouverture, puis l'habitacle (d'abord un peu grossi) prend le relais.
    const a = adoucir(entre(p, moments.approche));
    const fondu = entre(p, moments.entree);
    return {
      propre,
      porte: { opacite: 1 - fondu, echelle: 1 + (zoom - 1) * a },
      habitacle: { opacite: fondu, echelle: 1 + 0.25 * (1 - fondu) },
      titre: p < moments.entree[0] ? ('approche' as const) : p >= moments.entree[1] ? ('arret' as const) : null,
    };
  }
  // Sortie : on recule, l'habitacle propre laisse place à la portière propre, qui revient à son cadrage d'origine.
  const s = adoucir(entre(p, moments.sortie));
  const fondu = entre(p, moments.sortieFondu);
  return {
    propre,
    porte: { opacite: fondu, echelle: zoom - (zoom - 1) * s },
    habitacle: { opacite: 1 - fondu, echelle: 1 + 0.25 * fondu },
    titre: fondu >= 1 ? ('sortie' as const) : null,
  };
}

/** Rectangle où dessiner une image « object-fit: cover » de taille (iw × ih) dans une zone (w × h). */
export function cadrageCouvrant(iw: number, ih: number, w: number, h: number) {
  const e = Math.max(w / iw, h / ih);
  const largeur = iw * e;
  const hauteur = ih * e;
  return { x: (w - largeur) / 2, y: (h - hauteur) / 2, largeur, hauteur };
}

/**
 * Trajet du chiffon pour finir le nettoyage, comme sur une vitre : de droite à gauche, puis de gauche à droite une rangée
 * plus bas, et ainsi de suite jusqu'en bas. Rangées espacées d'un peu moins d'un diamètre, pour ne rien oublier.
 */
export function trajetVitre(largeur: number, hauteur: number, rayon: number): { x: number; y: number }[] {
  const pas = rayon * 1.5;
  const rangees = Math.max(1, Math.ceil((hauteur - rayon) / pas) + 1);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < rangees; i++) {
    const y = Math.min(hauteur - rayon * 0.5, rayon * 0.5 + i * pas);
    const [debut, fin] = i % 2 === 0 ? [largeur, 0] : [0, largeur];
    points.push({ x: debut, y }, { x: fin, y });
  }
  return points;
}

/** Point du trajet à une part donnée de sa longueur (0 → 1). */
export function pointDuTrajet(trajet: { x: number; y: number }[], k: number): { x: number; y: number } {
  const longueurs = trajet.slice(1).map((pt, i) => Math.hypot(pt.x - trajet[i].x, pt.y - trajet[i].y));
  let reste = Math.min(1, Math.max(0, k)) * longueurs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < longueurs.length; i++) {
    if (reste <= longueurs[i] || i === longueurs.length - 1) {
      const t = longueurs[i] ? Math.min(1, reste / longueurs[i]) : 0;
      return { x: trajet[i].x + (trajet[i + 1].x - trajet[i].x) * t, y: trajet[i].y + (trajet[i + 1].y - trajet[i].y) * t };
    }
    reste -= longueurs[i];
  }
  return trajet[trajet.length - 1];
}
