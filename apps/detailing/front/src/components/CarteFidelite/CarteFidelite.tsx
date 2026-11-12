import { messageCarte, type CarteFidelite as Carte } from '../../services/fidelite';
import styles from './CarteFidelite.module.css';

/** Carte de fidélité affichée en tampons (pleins / vides), avec le nombre lu aux lecteurs d'écran. */
export function CarteFidelite({ carte, titre = 'Ma carte de fidélité' }: { carte: Carte; titre?: string }) {
  const remplis = Math.min(carte.tampons, carte.tamponsRequis);
  return (
    <div className={styles.carte}>
      <p className={styles.titre}>{titre}</p>
      <p className={styles.tampons} role="img" aria-label={`${carte.tampons} tampon${carte.tampons > 1 ? 's' : ''} sur ${carte.tamponsRequis}`}>
        {Array.from({ length: carte.tamponsRequis }, (_, i) => (
          <span key={i} className={i < remplis ? styles.plein : styles.vide} aria-hidden="true">{i < remplis ? '★' : '☆'}</span>
        ))}
        <span className={styles.cadeau} aria-hidden="true">−{carte.remisePercent} %</span>
      </p>
      <p className={styles.message}>{messageCarte(carte)}</p>
    </div>
  );
}
