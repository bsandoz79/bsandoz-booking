import { useModeEdition } from '../../app/modeEditionContexte';
import styles from './ModeEdition.module.css';

/**
 * Crayon discret à côté (ou en haut à droite) d'un élément modifiable, visible seulement pour le pro connecté.
 * Icône seule : le libellé est lu par les lecteurs d'écran et affiché au survol.
 */
export function Crayon({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  const { actif } = useModeEdition();
  if (!actif) return null;
  return (
    <button type="button" className={styles.crayon} onClick={onClick} aria-label={libelle} title={libelle}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m13.5 6.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
