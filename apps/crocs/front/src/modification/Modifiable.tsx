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
        ? <a className={styles.toucher} href={href} aria-label={label} />
        : <button type="button" className={styles.toucher} aria-label={label} onClick={onToucher} />}
      <span className={styles.etiquette} aria-hidden="true">{label}</span>
    </div>
  );
}

/** Bandeau du mode modification, fixé en bas de l'écran. */
export function BarreModification({ verification }: { verification: boolean }) {
  return (
    <div className={styles.barre} role="region" aria-label="Mode modification">
      <p>
        {verification
          ? 'Vérification de la connexion…'
          : <><strong>Mode modification.</strong> Touchez un élément entouré pour le changer. C’est enregistré tout de suite.</>}
      </p>
      <div className={styles.barreLiens}>
        <a href="/pro">Espace pro</a>
        <a href="/" className={styles.terminer}>Terminer</a>
      </div>
    </div>
  );
}

export { ADRESSE_MODIFICATION };
