import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  title: string;
  /** Fermeture (Échap, clic sur le fond, bouton ✕). */
  onClose: () => void;
  /** Texte d'introduction sous le titre. */
  description?: ReactNode;
  children?: ReactNode;
  /** Boutons du bas (ex. « Non merci », « Valider »). */
  actions?: ReactNode;
  closeLabel?: string;
}

const FOCUSABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre modale accessible : rôle dialog, titre lié, focus placé dans la fenêtre à l'ouverture et gardé dedans
 * (Tab / Maj+Tab), Échap ou clic sur le fond pour fermer, focus rendu à l'élément d'origine à la fermeture.
 * Sur téléphone, la fenêtre monte du bas de l'écran.
 */
export function Dialog({ open, title, onClose, description, children, actions, closeLabel = 'Fermer' }: DialogProps) {
  const id = useId();
  const fenetre = useRef<HTMLDivElement>(null);
  const fermer = useRef(onClose);
  fermer.current = onClose;

  useEffect(() => {
    if (!open) return;
    const origine = document.activeElement as HTMLElement | null;
    const el = fenetre.current;
    (el?.querySelector<HTMLElement>(FOCUSABLES) ?? el)?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fermer.current(); return; }
      if (e.key !== 'Tab' || !el) return;
      const liste = [...el.querySelectorAll<HTMLElement>(FOCUSABLES)];
      if (liste.length === 0) return;
      const premier = liste[0], dernier = liste[liste.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    };
    document.addEventListener('keydown', touche);
    const defilement = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', touche);
      document.body.style.overflow = defilement;
      origine?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.fond} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={fenetre} className={styles.fenetre} role="dialog" aria-modal="true" aria-labelledby={`${id}-titre`}
        aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1}>
        <div className={styles.entete}>
          <h2 id={`${id}-titre`} className={styles.titre}>{title}</h2>
          <button type="button" className={styles.fermer} onClick={onClose} aria-label={closeLabel}>✕</button>
        </div>
        {description && <p id={`${id}-description`} className={styles.description}>{description}</p>}
        <div className={styles.contenu}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
