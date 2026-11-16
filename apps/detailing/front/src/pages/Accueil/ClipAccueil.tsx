import { useEffect, useRef, useState } from 'react';

const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Clip du haut de l'accueil : une voiture qu'on nettoie, 3 secondes, sans son. Démarre tout seul, ne joue qu'une fois
 * et reste sur sa dernière image ; la page défile normalement pendant la lecture. « Moins d'animations » : image fixe
 * (la photo choisie par le pro, sinon une image du clip).
 * Clip : Coverr (licence libre, usage commercial autorisé sans mention), recadré et raccourci.
 */
export function ClipAccueil({ photo }: { photo?: string }) {
  const [fixe] = useState(moinsDAnimations);
  const video = useRef<HTMLVideoElement>(null);
  const libelle = 'Nettoyage du pare-brise à la microfibre';

  // Lecture demandée explicitement : la vidéo est ajoutée après le chargement de la page, et certains navigateurs
  // n'appliquent alors pas « autoplay ». Sans son, la lecture automatique est toujours permise.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.muted = true;
    el.play()?.catch(() => undefined);
  }, []);

  if (fixe) return <img src={photo ?? '/videos/lavage-affiche.jpg'} width="900" height="900" alt={photo ? 'Photo de présentation' : libelle} fetchPriority="high" />;
  return (
    <video ref={video} src="/videos/lavage.mp4" poster="/videos/lavage-affiche.jpg" width={900} height={900}
      autoPlay muted playsInline preload="auto" aria-label={libelle} />
  );
}
