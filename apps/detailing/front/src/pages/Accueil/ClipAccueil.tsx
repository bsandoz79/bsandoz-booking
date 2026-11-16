import { useState } from 'react';

const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Clip du haut de l'accueil : une voiture qu'on nettoie, 3 secondes, sans son. Démarre tout seul, ne joue qu'une fois
 * et reste sur sa dernière image ; la page défile normalement pendant la lecture. « Moins d'animations » : image fixe.
 * Clip : Coverr (licence libre, usage commercial autorisé sans mention), recadré et raccourci.
 */
export function ClipAccueil() {
  const [fixe] = useState(moinsDAnimations);
  const libelle = 'Nettoyage du pare-brise à la microfibre';
  if (fixe) return <img src="/videos/lavage-affiche.jpg" width="900" height="900" alt={libelle} fetchPriority="high" />;
  return (
    <video src="/videos/lavage.mp4" poster="/videos/lavage-affiche.jpg" width={900} height={900}
      autoPlay muted playsInline preload="auto" aria-label={libelle} />
  );
}
