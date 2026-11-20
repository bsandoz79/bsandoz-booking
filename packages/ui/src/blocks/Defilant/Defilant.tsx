import { Children, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Fleche } from '../Visionneuse';
import styles from './Defilant.module.css';

export interface DefilantLibelles {
  precedent: string;
  suivant: string;
  pause: string;
  lecture: string;
}

export interface DefilantProps {
  /** Les éléments qui défilent (avis, photos…), un enfant par élément. */
  children: ReactNode;
  /** Nom de la zone, lu par les lecteurs d'écran (ex. « Avis des clients »). */
  label: string;
  /** Éléments visibles à la fois sur grand écran (par défaut 3). */
  visibles?: number;
  /** Éléments visibles à la fois sur téléphone (par défaut 1). */
  visiblesMobile?: number;
  /** Largeur d'écran (px) à partir de laquelle `visibles` s'applique (par défaut 720). */
  largeurMin?: number;
  /** Temps entre deux pas, en millisecondes (par défaut 3000). */
  intervalle?: number;
  libelles?: Partial<DefilantLibelles>;
}

const LIBELLES: DefilantLibelles = {
  precedent: 'Précédent',
  suivant: 'Suivant',
  pause: 'Mettre en pause le défilement',
  lecture: 'Reprendre le défilement',
};

/** Durée d'un pas (doit suivre la transition du CSS). */
const DUREE_PAS = 600;

const correspond = (requete: string) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(requete).matches;

function useRequete(requete: string, parDefaut: boolean): boolean {
  const [ok, setOk] = useState(() => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? correspond(requete) : parDefaut));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const liste = window.matchMedia(requete);
    const suivre = () => setOk(liste.matches);
    suivre();
    liste.addEventListener('change', suivre);
    return () => liste.removeEventListener('change', suivre);
  }, [requete]);
  return ok;
}

/**
 * Bande d'éléments qui défile toute seule : `visibles` éléments à la fois ; à chaque pas, celui de gauche sort,
 * les autres glissent d'un cran et un nouveau entre à droite, en boucle. Pause au survol, au clavier (focus)
 * et par un bouton ; pas de défilement automatique si l'appareil demande moins d'animations.
 * Pas plus d'éléments que de places : simple liste, sans boutons.
 */
export function Defilant({ children, label, visibles = 3, visiblesMobile = 1, largeurMin = 720, intervalle = 3000, libelles }: DefilantProps) {
  const l = { ...LIBELLES, ...libelles };
  const elements = Children.toArray(children);
  const n = elements.length;
  const grand = useRequete(`(min-width: ${largeurMin}px)`, true);
  const moinsDAnimations = useRequete('(prefers-reduced-motion: reduce)', false);
  const parPage = Math.max(1, grand ? visibles : visiblesMobile);
  const defile = n > parPage;

  const [index, setIndex] = useState(0);
  const [sansTransition, setSansTransition] = useState(false);
  const [enPause, setEnPause] = useState(moinsDAnimations);
  const [survol, setSurvol] = useState(false);
  const piste = useRef<HTMLUListElement>(null);
  /** Un seul élément à la fois : la bande prend la hauteur de celui affiché (pas de grand blanc sous un avis court). */
  const [hauteur, setHauteur] = useState<number>();

  useEffect(() => { if (moinsDAnimations) setEnPause(true); }, [moinsDAnimations]);
  useEffect(() => { setIndex(0); }, [parPage, n]);

  // Pas automatique.
  useEffect(() => {
    if (!defile || enPause || survol) return;
    const minuteur = window.setInterval(() => setIndex((i) => i + 1), intervalle);
    return () => window.clearInterval(minuteur);
  }, [defile, enPause, survol, intervalle]);

  // Arrivé sur les copies du début : on revient au vrai début sans animation (rien ne bouge à l'écran).
  useEffect(() => {
    if (index < n) return;
    const minuteur = window.setTimeout(() => {
      setSansTransition(true);
      setIndex((i) => i - n);
    }, moinsDAnimations ? 0 : DUREE_PAS);
    return () => window.clearTimeout(minuteur);
  }, [index, n, moinsDAnimations]);

  // Après un saut sans animation : le navigateur applique la position, puis l'animation revient.
  useLayoutEffect(() => {
    if (!sansTransition) return;
    void piste.current?.offsetWidth;
    setSansTransition(false);
  }, [sansTransition]);

  useLayoutEffect(() => {
    if (parPage !== 1 || !piste.current) {
      setHauteur(undefined);
      return;
    }
    const element = piste.current.children[index] as HTMLElement | undefined;
    const mesurer = () => {
      const h = element?.offsetHeight ?? 0;
      setHauteur(h > 0 ? h : undefined);
    };
    mesurer();
    // Police ou image chargée après coup : la hauteur suit.
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [index, parPage, n]);

  const reculer = () => {
    if (index > 0) {
      setIndex(index - 1);
      return;
    }
    // Au début : saut invisible sur les copies, puis un pas en arrière.
    setSansTransition(true);
    setIndex(n);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setIndex(n - 1)));
  };

  if (!defile) {
    return (
      <ul className={styles.statique} aria-label={label} style={{ '--_visibles': Math.max(1, Math.min(n, parPage)) } as CSSProperties}>
        {elements.map((e, i) => <li key={i} className={styles.element}>{e}</li>)}
      </ul>
    );
  }

  const copies = elements.slice(0, parPage);
  return (
    <section
      className={styles.defilant}
      aria-roledescription="carrousel"
      aria-label={label}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false); }}
    >
      <div className={styles.fenetre} style={hauteur ? { height: hauteur } : undefined}>
        <ul
          ref={piste}
          className={[styles.piste, sansTransition ? styles.sansTransition : ''].join(' ').trim()}
          style={{ '--_visibles': parPage, transform: `translateX(-${(index * 100) / parPage}%)` } as CSSProperties}
          aria-live={enPause ? 'polite' : 'off'}
          data-position={index}
        >
          {elements.map((e, i) => <li key={i} className={styles.element}>{e}</li>)}
          {copies.map((e, i) => <li key={`copie-${i}`} className={styles.element} aria-hidden="true" inert>{e}</li>)}
        </ul>
      </div>
      <div className={styles.commandes}>
        <button type="button" aria-label={l.precedent} onClick={reculer}>
          <Fleche sens="gauche" />
        </button>
        <button type="button" aria-label={enPause ? l.lecture : l.pause} onClick={() => setEnPause((p) => !p)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            {enPause
              ? <path d="M8 5.5v13l10-6.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              : <path d="M9 6v12M15 6v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
          </svg>
        </button>
        <button type="button" aria-label={l.suivant} onClick={() => setIndex((i) => (i >= n ? i : i + 1))}>
          <Fleche sens="droite" />
        </button>
      </div>
    </section>
  );
}
