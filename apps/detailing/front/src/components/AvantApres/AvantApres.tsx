import { useState } from 'react';
import styles from './AvantApres.module.css';

/** Comparateur avant / après : on fait glisser la séparation (doigt, souris ou flèches du clavier). */
export function AvantApres({ avant, apres, titre }: { avant: string; apres: string; titre: string }) {
  const [position, setPosition] = useState(50);
  return (
    <div className={styles.comparateur} style={{ '--position': `${position}%` } as React.CSSProperties}>
      <img src={apres} alt={`${titre} – après`} className={styles.image} loading="lazy" />
      <div className={styles.avant} aria-hidden="true"><img src={avant} alt="" className={styles.image} loading="lazy" /></div>
      <span className={`${styles.etiquette} ${styles.gauche}`} aria-hidden="true">Avant</span>
      <span className={`${styles.etiquette} ${styles.droite}`} aria-hidden="true">Après</span>
      <span className={styles.poignee} aria-hidden="true" />
      <input type="range" min={0} max={100} value={position} onChange={(e) => setPosition(Number(e.target.value))}
        className={styles.curseur} aria-label={`${titre} : faire glisser pour comparer avant et après`} />
    </div>
  );
}
