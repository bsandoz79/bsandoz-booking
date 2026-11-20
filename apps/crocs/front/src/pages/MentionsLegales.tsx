import { useEffect } from 'react';
import { crocs } from '../data/crocs';
import { mentionsLegales } from '../data/legal';
import styles from './MentionsLegales.module.css';

/** Page « Mentions légales et données personnelles » (/mentions-legales). */
export function MentionsLegales() {
  useEffect(() => {
    document.title = `Mentions légales · ${crocs.nom}`;
  }, []);

  return (
    <main className={styles.page}>
      <a href="/" className={styles.retour}>← Retour au site de {crocs.nom}</a>
      <h1 className={styles.titre}>Mentions légales et données personnelles</h1>
      {mentionsLegales.map((s) => {
        const id = `legal-${s.titre.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '-')}`;
        return (
          <section key={s.titre} aria-labelledby={id} className={styles.section}>
            <h2 id={id}>{s.titre}</h2>
            {s.paragraphes.map((p) => <p key={p}>{p}</p>)}
          </section>
        );
      })}
    </main>
  );
}
