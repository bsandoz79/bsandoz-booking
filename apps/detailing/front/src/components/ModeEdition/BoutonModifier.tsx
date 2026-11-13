import { useModeEdition } from '../../app/modeEditionContexte';
import styles from './ModeEdition.module.css';

/** Petit crayon à côté d'un élément modifiable (visible seulement pour le pro connecté). */
export function Crayon({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  const { actif } = useModeEdition();
  if (!actif) return null;
  return (
    <button type="button" className={styles.crayon} onClick={onClick} aria-label={libelle} title={libelle}>
      <span aria-hidden="true">✏️</span> Modifier
    </button>
  );
}
