import { messageCarte, type CarteFidelite as Carte } from '../../services/fidelite';
import { SITE } from '../../data/site';
import styles from './CarteFidelite.module.css';

/** Inclinaison de chaque tampon, comme posé à la main (toujours la même pour une case donnée). */
const INCLINAISONS = [-12, 9, -5, 14, -9, 6, -14, 11, -3, 8];

/**
 * Carte de fidélité façon carte en carton : une case par prestation, tamponnée du logo quand elle est acquise,
 * puis la case « remise ». Le dernier tampon arrive avec une animation (coupée si l'animation est réduite).
 * Le nombre de tampons est lu aux lecteurs d'écran.
 */
export function CarteFidelite({ carte, titre = 'Ma carte de fidélité', exemple = false }: { carte: Carte; titre?: string; exemple?: boolean }) {
  const remplis = Math.min(carte.tampons, carte.tamponsRequis);
  return (
    <div className={styles.carte}>
      <div className={styles.entete}>
        <img src="/logo.png" alt="" className={styles.logo} width="46" height="40" />
        <div>
          <p className={styles.titre}>{titre}</p>
          <p className={styles.sousTitre}>{SITE.brand} · {SITE.activity.toLowerCase()}</p>
        </div>
        {exemple && <span className={styles.exemple}>Exemple</span>}
      </div>
      <div className={styles.cases} role="img" aria-label={`${carte.tampons} tampon${carte.tampons > 1 ? 's' : ''} sur ${carte.tamponsRequis}`}>
        {Array.from({ length: carte.tamponsRequis }, (_, i) => (
          <div key={i} className={styles.case} aria-hidden="true">
            {i >= remplis && <span className={styles.numero}>{i + 1}</span>}
            {i < remplis && (
              <img
                // La clé change avec le nombre de tampons : le dernier ajouté rejoue l'animation.
                key={i === remplis - 1 ? `dernier-${carte.tampons}` : i}
                src="/tampon.png"
                alt=""
                className={`${styles.tampon} ${i === remplis - 1 && !exemple ? styles.nouveau : ''}`}
                style={{ ['--inclinaison' as string]: `${INCLINAISONS[i % INCLINAISONS.length]}deg` }}
              />
            )}
          </div>
        ))}
        <div className={`${styles.case} ${styles.cadeau} ${carte.remiseDisponible ? styles.cadeauPret : ''}`} aria-hidden="true">
          <strong>−{carte.remisePercent} %</strong>
          <span>{carte.remiseDisponible ? 'à utiliser' : 'ensuite'}</span>
        </div>
      </div>
      <p className={styles.message}>{messageCarte(carte)}</p>
    </div>
  );
}
