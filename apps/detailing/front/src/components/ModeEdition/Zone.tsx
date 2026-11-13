import type { ReactNode } from 'react';
import { useModeEdition } from '../../app/modeEditionContexte';
import styles from './ModeEdition.module.css';

/**
 * Zone modifiable du site : pour le pro connecté, contour en pointillés et crayon(s) dans le coin en haut à droite ;
 * pour les visiteurs, le contenu seul, sans élément ajouté.
 */
export function Zone({ crayons, children, className }: { crayons: ReactNode; children: ReactNode; className?: string }) {
  const { actif } = useModeEdition();
  if (!actif) return <>{children}</>;
  return (
    <div className={`${styles.zone} ${className ?? ''}`}>
      {children}
      <div className={styles.zoneCrayons}>{crayons}</div>
    </div>
  );
}
