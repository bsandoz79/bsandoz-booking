import { useEffect, useRef, useState } from 'react';
import styles from './HeroAccueil.module.css';

const moinsDAnimations = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
const portrait = () => typeof window !== 'undefined' && window.matchMedia?.('(orientation: portrait)').matches === true;

/** Durée au-delà de laquelle le texte s'affiche quoi qu'il arrive (clip lent à charger, lecture bloquée sans erreur). */
const SECURITE_MS = 5000;

/**
 * Clip plein écran du haut de l'accueil : une voiture qu'on nettoie, 3 secondes, sans son, version verticale sur
 * téléphone et horizontale sur ordinateur. Joué une fois, il reste sur sa dernière image ; `onFin` prévient l'accueil
 * pour faire apparaître le texte par-dessus. Lecture bloquée (économie d'énergie), erreur ou trop lente : `onFin` tout
 * de suite. « Moins d'animations » : image fixe (photo choisie par le pro, sinon la dernière image du clip) et `onFin`.
 * Clip : Coverr (licence libre, usage commercial autorisé sans mention), recadré sans aucune marque visible.
 */
export function ClipAccueil({ photo, onFin }: { photo?: string; onFin: () => void }) {
  const [fixe] = useState(moinsDAnimations);
  const [format] = useState(() => (portrait() ? 'portrait' : 'paysage'));
  const video = useRef<HTMLVideoElement>(null);
  const fin = useRef(onFin);
  useEffect(() => { fin.current = onFin; }, [onFin]);

  useEffect(() => {
    if (fixe) { fin.current(); return; }
    const el = video.current;
    const securite = window.setTimeout(() => fin.current(), SECURITE_MS);
    if (el) {
      // Lecture demandée explicitement : la vidéo est ajoutée après le chargement de la page, et certains navigateurs
      // n'appliquent alors pas « autoplay ». Sans son, la lecture automatique est permise ; sinon, place au texte.
      el.muted = true;
      el.play()?.catch(() => fin.current());
    }
    return () => window.clearTimeout(securite);
  }, [fixe]);

  if (fixe) {
    return <img className={styles.fond} src={photo ?? `/videos/lavage-${format}-fin.jpg`} alt="" fetchPriority="high" />;
  }
  return (
    <video ref={video} className={styles.fond} src={`/videos/lavage-${format}.mp4`} poster={`/videos/lavage-${format}-affiche.jpg`}
      autoPlay muted playsInline preload="auto" aria-hidden="true" tabIndex={-1}
      onEnded={() => fin.current()} onError={() => fin.current()} />
  );
}
