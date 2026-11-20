import { Cadre } from '../components/Cadre';
import type { PageLegale as Contenu } from '../data/legal';
import styles from './PageLegale.module.css';

/** Page légale (mentions légales, confidentialité) : titre, introduction, puis une section par sujet. */
export function PageLegale({ page }: { page: Contenu }) {
  return (
    <Cadre>
      <article className={styles.page}>
        <h1>{page.titre}</h1>
        <p className={styles.intro}>{page.intro}</p>
        {page.sections.map((s) => (
          <section key={s.titre}>
            <h2>{s.titre}</h2>
            {s.paragraphes.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}
        <p><a href="/">Retour à l’accueil</a></p>
      </article>
    </Cadre>
  );
}
