import { useModeEdition } from '../../app/modeEditionContexte';
import styles from './ModeEdition.module.css';

/** Bouton flottant (en bas à gauche) du pro connecté : passe le site en mode modification, et en sort. */
export function BoutonModifier() {
  const { peutModifier, actif, basculer } = useModeEdition();
  if (!peutModifier) return null;
  return (
    <>
      {actif && <p className={styles.bandeau} role="status">Mode modification : cliquez sur ✏️ à côté d’un élément pour le changer.</p>}
      <button type="button" className={`${styles.bouton} ${actif ? styles.actif : ''}`} aria-pressed={actif} onClick={basculer}>
        <span aria-hidden="true">{actif ? '✓' : '✏️'}</span> {actif ? 'Terminer' : 'Modifier le site'}
      </button>
    </>
  );
}

/** Petit crayon à côté d'un élément modifiable (visible seulement en mode modification). */
export function Crayon({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  const { actif } = useModeEdition();
  if (!actif) return null;
  return (
    <button type="button" className={styles.crayon} onClick={onClick} aria-label={libelle} title={libelle}>
      <span aria-hidden="true">✏️</span> Modifier
    </button>
  );
}
