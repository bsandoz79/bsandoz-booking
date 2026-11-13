import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import styles from './SortableList.module.css';

export interface SortableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Contenu d'un élément (la poignée est ajoutée par le bloc). */
  renderItem: (item: T) => ReactNode;
  /** Nouvel ordre, appelé une fois l'élément lâché (ou déplacé au clavier). */
  onReorder: (keys: string[]) => void;
  /** Nom de la liste, lu par les lecteurs d'écran. */
  label: string;
  /** Libellé de la poignée d'un élément, ex. « Déplacer Microfibre ». */
  handleLabel: (item: T) => string;
  /** Annonce après un déplacement, ex. « Microfibre : position 3 sur 5 ». */
  movedMessage?: (item: T, position: number, total: number) => string;
  /** Mise en page : liste verticale ou grille de cartes. */
  layout?: 'list' | 'grid';
  /** Nom de chaque élément (lu par les lecteurs d'écran), facultatif. */
  getItemLabel?: (item: T) => string;
  /** Délai d'appui avant de pouvoir déplacer sur écran tactile (ms). */
  longPressMs?: number;
  className?: string;
}

const deplacer = <T,>(liste: T[], de: number, vers: number) => {
  const copie = [...liste];
  const [element] = copie.splice(de, 1);
  copie.splice(vers, 0, element);
  return copie;
};

/**
 * Liste réordonnable :
 * - souris : on saisit l'élément et on le fait glisser ;
 * - écran tactile : appui long (l'élément se soulève), puis glisser ; un geste rapide fait défiler la page normalement ;
 * - clavier : la poignée prend le focus, flèches haut / bas (ou gauche / droite) pour déplacer, annonce vocale.
 * Les boutons et liens placés dans un élément restent utilisables (ils ne déclenchent pas le déplacement).
 */
export function SortableList<T>({
  items, getKey, renderItem, onReorder, label, handleLabel, movedMessage, getItemLabel, layout = 'list', longPressMs = 350, className,
}: SortableListProps<T>) {
  const [ordre, setOrdre] = useState(items);
  const [saisi, setSaisi] = useState<string>();
  const [annonce, setAnnonce] = useState('');
  const liste = useRef<HTMLUListElement>(null);
  const appui = useRef<{ cle: string; x: number; y: number; minuterie?: number; tactile: boolean }>(undefined);
  const ordreCourant = useRef(ordre);
  ordreCourant.current = ordre;
  const poignees = useRef(new Map<string, HTMLButtonElement>());

  // Nouvelle liste reçue (enregistrement, filtre) : on la reprend, sauf pendant un déplacement.
  useEffect(() => { if (!saisi) setOrdre(items); }, [items, saisi]);

  // Pendant un déplacement au doigt : la page ne défile pas.
  useEffect(() => {
    const el = liste.current;
    if (!el || !saisi) return;
    const bloquer = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchmove', bloquer, { passive: false });
    return () => el.removeEventListener('touchmove', bloquer);
  }, [saisi]);

  const terminer = () => {
    if (appui.current?.minuterie) window.clearTimeout(appui.current.minuterie);
    appui.current = undefined;
    if (!saisi) return;
    setSaisi(undefined);
    const avant = items.map(getKey).join('|');
    const apres = ordreCourant.current.map(getKey);
    if (apres.join('|') !== avant) onReorder(apres);
  };

  const debut = (e: PointerEvent<HTMLLIElement>, cle: string) => {
    if (e.button !== 0) return;
    // Un bouton, un lien ou un champ dans l'élément garde son comportement.
    const cible = e.target as HTMLElement;
    if (cible.closest('a, input, select, textarea, label') || (cible.closest('button') && !cible.closest('[data-poignee]'))) return;
    const tactile = e.pointerType === 'touch';
    appui.current = { cle, x: e.clientX, y: e.clientY, tactile };
    if (tactile) appui.current.minuterie = window.setTimeout(() => { setSaisi(cle); navigator.vibrate?.(15); }, longPressMs);
  };

  const mouvement = (e: PointerEvent<HTMLUListElement>) => {
    const a = appui.current;
    if (!a) return;
    if (!saisi) {
      const ecart = Math.hypot(e.clientX - a.x, e.clientY - a.y);
      // Doigt qui bouge avant l'appui long : c'est un défilement, on abandonne. Souris : 6 px suffisent pour saisir.
      if (a.tactile) { if (ecart > 10) terminer(); return; }
      if (ecart < 6) return;
      setSaisi(a.cle);
    }
    const sous = document.elementFromPoint?.(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cle]');
    const cleSous = sous?.dataset.cle;
    const cleSaisie = saisi ?? a.cle;
    if (!cleSous || cleSous === cleSaisie) return;
    const courant = ordreCourant.current;
    const de = courant.findIndex((x) => getKey(x) === cleSaisie);
    const vers = courant.findIndex((x) => getKey(x) === cleSous);
    if (de >= 0 && vers >= 0) setOrdre(deplacer(courant, de, vers));
  };

  const clavier = (e: KeyboardEvent<HTMLButtonElement>, item: T) => {
    const sens = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
    if (!sens) return;
    e.preventDefault();
    const de = ordre.findIndex((x) => getKey(x) === getKey(item));
    const vers = de + sens;
    if (vers < 0 || vers >= ordre.length) return;
    const nouvel = deplacer(ordre, de, vers);
    setOrdre(nouvel);
    onReorder(nouvel.map(getKey));
    setAnnonce(movedMessage?.(item, vers + 1, nouvel.length) ?? `Position ${vers + 1} sur ${nouvel.length}`);
    // Le focus suit l'élément déplacé.
    requestAnimationFrame(() => poignees.current.get(getKey(item))?.focus());
  };

  return (
    <>
      <ul ref={liste} aria-label={label} className={[styles.liste, layout === 'grid' ? styles.grille : '', saisi ? styles.enCours : '', className ?? ''].join(' ').trim()}
        onPointerMove={mouvement} onPointerUp={terminer} onPointerCancel={terminer} onPointerLeave={() => { if (!saisi) terminer(); }}>
        {ordre.map((item) => {
          const cle = getKey(item);
          return (
            <li key={cle} data-cle={cle} aria-label={getItemLabel?.(item)} className={[styles.element, saisi === cle ? styles.saisi : ''].join(' ').trim()}
              onPointerDown={(e) => debut(e, cle)} onContextMenu={(e) => { if (appui.current?.tactile) e.preventDefault(); }}>
              <button type="button" data-poignee className={styles.poignee} aria-label={handleLabel(item)}
                ref={(el) => { if (el) poignees.current.set(cle, el); else poignees.current.delete(cle); }}
                onKeyDown={(e) => clavier(e, item)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></g></svg>
              </button>
              <div className={styles.contenu}>{renderItem(item)}</div>
            </li>
          );
        })}
      </ul>
      <p className={styles.srOnly} aria-live="polite">{annonce}</p>
    </>
  );
}
