import type { ReactNode } from 'react';
import { ADRESSE_MODIFICATION } from './useModeModification';
import styles from './Modification.module.css';

interface Props {
  /** Hors mode modification : le contenu seul, sans cadre. */
  actif: boolean;
  /** Nom du bouton (« Modifier la phrase d'accueil »). */
  label: string;
  children: ReactNode;
  /** Toucher ouvre une fenêtre… */
  onToucher?: () => void;
  /** … ou mène à l'espace pro (avis, photos). */
  href?: string;
  className?: string;
}

/**
 * Élément du site modifiable par le patron : entouré en pointillé, avec un bouton transparent posé dessus
 * (le contenu reste lu tel quel par les lecteurs d'écran).
 */
export function Modifiable({ actif, label, children, onToucher, href, className }: Props) {
  if (!actif) return <>{children}</>;
  return (
    <div className={[styles.modifiable, className].filter(Boolean).join(' ')}>
      {children}
      {href
        ? <a data-modification className={styles.toucher} href={href} aria-label={label} />
        : <button type="button" data-modification className={styles.toucher} aria-label={label} onClick={onToucher} />}
      <span className={styles.etiquette} aria-hidden="true">{label}</span>
    </div>
  );
}

/** Bandeau du mode modification, fixé en bas de l'écran. */
export function BarreModification({ verification, avertissement = false }: { verification: boolean; avertissement?: boolean }) {
  return (
    <div className={styles.barre} role="region" aria-label="Mode modification" data-modification>
      <p aria-live="polite">
        {verification
          ? 'Vérification de la connexion…'
          : avertissement
            ? <><strong>Ce bouton ne s’ouvre pas pendant la modification.</strong> Touchez un élément entouré, ou « Terminer » pour revenir au site.</>
            : <><strong>Mode modification.</strong> Touchez un élément entouré pour le changer. C’est enregistré tout de suite.</>}
      </p>
      <div className={styles.barreLiens}>
        <a href="/pro">Espace pro</a>
        <a href="/" className={styles.terminer}>Terminer</a>
      </div>
    </div>
  );
}

/**
 * Pendant la modification, les liens et boutons du site (Appeler, Itinéraire, Google Maps, Me localiser…) ne font rien :
 * un toucher pour modifier ne doit jamais appeler, ouvrir une carte ou quitter la page.
 * Restent actifs : les boutons de modification (`data-modification`), les fenêtres de saisie et les liens vers une partie de la page.
 * Renvoie true si le toucher a été bloqué.
 */
export function bloquerHorsModification(e: { target: EventTarget | null; preventDefault: () => void; stopPropagation: () => void }): boolean {
  const cible = e.target instanceof Element ? e.target.closest('a, button, input[type="submit"], form') : null;
  if (!cible || cible.closest('[data-modification], [role="dialog"]')) return false;
  if (cible instanceof HTMLAnchorElement && cible.getAttribute('href')?.startsWith('#')) return false;
  e.preventDefault();
  e.stopPropagation();
  return true;
}

export { ADRESSE_MODIFICATION };
