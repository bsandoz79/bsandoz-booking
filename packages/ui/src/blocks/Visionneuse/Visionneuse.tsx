import { useEffect, useRef } from 'react';
import styles from './Visionneuse.module.css';

export interface PhotoVisionneuse {
  url: string;
  /** Ce que montre la photo (texte alternatif, aussi affiché en légende). */
  description: string;
}

export interface VisionneuseLibelles {
  fermer: string;
  precedente: string;
  suivante: string;
  /** « {n} » et « {total} » sont remplacés. */
  position: string;
  titre: string;
}

export interface VisionneuseProps {
  photos: PhotoVisionneuse[];
  /** Rang de la photo ouverte ; null : fermée. */
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
  libelles?: Partial<VisionneuseLibelles>;
}

const LIBELLES: VisionneuseLibelles = {
  fermer: 'Fermer',
  precedente: 'Photo précédente',
  suivante: 'Photo suivante',
  position: '{n} / {total}',
  titre: 'Photo agrandie',
};

const FOCUSABLES = 'button:not([disabled])';

/** Flèche fine (gauche ou droite), dessinée en trait. */
export function Fleche({ sens }: { sens: 'gauche' | 'droite' }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d={sens === 'gauche' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Photo agrandie en plein écran, sur fond sombre : flèches (et touches ← →) pour passer d'une photo à l'autre,
 * fermeture par la croix, Échap ou un clic sur le fond. Focus gardé dans la visionneuse puis rendu à la photo d'origine.
 */
export function Visionneuse({ photos, index, onChange, onClose, libelles }: VisionneuseProps) {
  const l = { ...LIBELLES, ...libelles };
  const fenetre = useRef<HTMLDivElement>(null);
  const actions = useRef({ onChange, onClose, index, n: photos.length });
  actions.current = { onChange, onClose, index, n: photos.length };
  const ouverte = index !== null && photos.length > 0;

  useEffect(() => {
    if (!ouverte) return;
    const origine = document.activeElement as HTMLElement | null;
    fenetre.current?.querySelector<HTMLElement>(FOCUSABLES)?.focus();
    const touche = (e: KeyboardEvent) => {
      const { onChange: changer, onClose: fermer, index: i, n } = actions.current;
      if (i === null) return;
      if (e.key === 'Escape') { e.preventDefault(); fermer(); }
      else if (e.key === 'ArrowLeft' && n > 1) { e.preventDefault(); changer((i - 1 + n) % n); }
      else if (e.key === 'ArrowRight' && n > 1) { e.preventDefault(); changer((i + 1) % n); }
      else if (e.key === 'Tab' && fenetre.current) {
        const liste = [...fenetre.current.querySelectorAll<HTMLElement>(FOCUSABLES)];
        const premier = liste[0], dernier = liste[liste.length - 1];
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      }
    };
    document.addEventListener('keydown', touche);
    const defilement = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', touche);
      document.body.style.overflow = defilement;
      origine?.focus?.();
    };
  }, [ouverte]);

  if (!ouverte || index === null) return null;
  const i = Math.min(index, photos.length - 1);
  const photo = photos[i];
  const plusieurs = photos.length > 1;

  return (
    <div className={styles.fond} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={fenetre} className={styles.visionneuse} role="dialog" aria-modal="true" aria-label={l.titre}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <button type="button" className={styles.fermer} onClick={onClose} aria-label={l.fermer}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <figure className={styles.figure}>
          <img src={photo.url} alt={photo.description} className={styles.image} />
          <figcaption className={styles.legende}>
            {photo.description}
            {plusieurs && <span className={styles.position}> · {l.position.replace('{n}', String(i + 1)).replace('{total}', String(photos.length))}</span>}
          </figcaption>
        </figure>
        {plusieurs && (
          <>
            <button type="button" className={`${styles.fleche} ${styles.gauche}`} onClick={() => onChange((i - 1 + photos.length) % photos.length)} aria-label={l.precedente}>
              <Fleche sens="gauche" />
            </button>
            <button type="button" className={`${styles.fleche} ${styles.droite}`} onClick={() => onChange((i + 1) % photos.length)} aria-label={l.suivante}>
              <Fleche sens="droite" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
