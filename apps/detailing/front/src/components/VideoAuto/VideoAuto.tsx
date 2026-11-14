import { useEffect, useRef } from 'react';

/**
 * Vidéo sans son qui se lance toute seule, en boucle, quand elle arrive à l'écran, et se met en pause quand elle en
 * sort (pas de données consommées pour rien). Rien n'est téléchargé avant. Les commandes restent là pour la mettre en
 * pause. « Moins d'animations » demandé : elle ne démarre pas d'elle-même.
 */
export function VideoAuto({ src, affiche, libelle, largeur, hauteur }: { src: string; affiche: string; libelle: string; largeur: number; hauteur: number }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const observateur = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting) el.play().catch(() => undefined);
      else el.pause();
    }, { threshold: 0.4 });
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <video ref={video} controls muted loop playsInline preload="none" width={largeur} height={hauteur} poster={affiche} aria-label={libelle}>
      <source src={src} type="video/mp4" />
    </video>
  );
}
