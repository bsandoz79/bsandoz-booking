import { useEffect, useState } from 'react';
import { Fleche } from '@bsandoz/ui';
import styles from './PhotosHero.module.css';

export interface PhotoHero {
  url: string;
  description: string;
}

const correspond = (requete: string) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(requete).matches;

/**
 * Photos du haut de page, dans le cadre penché : elles se remplacent en fondu toutes les `intervalle` ms, en boucle.
 * Pause au survol, au clavier et par un bouton ; rien d'automatique si l'appareil demande moins d'animations.
 * Un clic sur la photo l'agrandit (`onAgrandir`).
 */
export function PhotosHero({ photos, onAgrandir, intervalle = 4000 }: { photos: PhotoHero[]; onAgrandir: (i: number) => void; intervalle?: number }) {
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(() => correspond('(prefers-reduced-motion: reduce)'));
  const [survol, setSurvol] = useState(false);
  const n = photos.length;
  const i = Math.min(index, Math.max(0, n - 1));

  useEffect(() => {
    if (n < 2 || enPause || survol) return;
    const minuteur = window.setInterval(() => setIndex((k) => (k + 1) % n), intervalle);
    return () => window.clearInterval(minuteur);
  }, [n, enPause, survol, intervalle]);

  if (n === 0) return null;

  return (
    <figure
      className={styles.photosHero}
      aria-roledescription="carrousel"
      aria-label="Photos de Croc’s"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false); }}
    >
      <button type="button" className={styles.cadre} onClick={() => onAgrandir(i)} aria-label={`Agrandir la photo : ${photos[i].description}`}>
        {photos.map((p, k) => (
          <img key={p.url} src={p.url} alt="" className={k === i ? styles.visible : undefined} loading={k === 0 ? undefined : 'lazy'} />
        ))}
      </button>
      {n > 1 && (
        <div className={styles.commandes}>
          <button type="button" aria-label="Photo précédente" onClick={() => setIndex((i - 1 + n) % n)}><Fleche sens="gauche" /></button>
          <button type="button" aria-label={enPause ? 'Reprendre le défilement' : 'Mettre en pause le défilement'} onClick={() => setEnPause((p) => !p)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              {enPause
                ? <path d="M8 5.5v13l10-6.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                : <path d="M9 6v12M15 6v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
            </svg>
          </button>
          <button type="button" aria-label="Photo suivante" onClick={() => setIndex((i + 1) % n)}><Fleche sens="droite" /></button>
        </div>
      )}
    </figure>
  );
}
