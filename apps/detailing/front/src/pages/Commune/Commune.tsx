import { Link, useParams } from 'react-router-dom';
import { COMMUNES, PRESTATIONS_SEO, pageCommune } from '../../seo/donnees';
import { useSeo } from '../../seo/useSeo';
import { PageIntrouvable } from '../Legal/Legal';
import styles from './Commune.module.css';

/** Page locale « Nettoyage de voiture à domicile à <commune> » (référencement local), liée depuis l'accueil. */
export function Commune() {
  const { commune: slug } = useParams();
  const commune = COMMUNES.find((c) => c.slug === slug);
  const page = commune ? pageCommune(commune) : undefined;
  useSeo(page?.titre ?? 'Page introuvable | Perfect Clean', page?.description);

  if (!commune || !page) return <PageIntrouvable />;
  const voisines = COMMUNES.filter((c) => c.slug !== commune.slug);

  return (
    <main className={`container ${styles.page}`}>
      <p className={styles.surtitre}>Perfect Clean · {commune.nom} ({commune.codePostal})</p>
      <h1>{page.h1}</h1>
      <p className={styles.intro}>{page.texte}</p>
      <p><Link to="/reserver" className="btn">Réserver un créneau à {commune.nom}</Link></p>

      <section aria-labelledby="titre-prestations-commune" className={styles.section}>
        <h2 id="titre-prestations-commune">Prestations à {commune.nom}</h2>
        <ul className={styles.liste}>
          {PRESTATIONS_SEO.map((p) => (
            <li key={p.nom}><strong>{p.nom}</strong> ({p.detail}) : à partir de {p.aPartirDe} €</li>
          ))}
        </ul>
        <p>Même prix quel que soit le véhicule. Les frais de déplacement depuis Abbeville sont calculés automatiquement à partir de votre adresse lors de la réservation.</p>
      </section>

      <section aria-labelledby="titre-comment" className={styles.section}>
        <h2 id="titre-comment">Comment ça se passe à {commune.nom} ?</h2>
        <p>Vous choisissez la prestation et le créneau en ligne, réglez un acompte, et je viens à l’adresse indiquée — devant chez vous ou sur votre lieu de travail — avec tout le matériel, autonome en eau et en électricité. Le solde se règle sur place.</p>
      </section>

      <section aria-labelledby="titre-voisines" className={styles.section}>
        <h2 id="titre-voisines">Également autour d’Abbeville</h2>
        <ul className={styles.voisines}>
          {voisines.map((c) => <li key={c.slug}><Link to={`/nettoyage-voiture/${c.slug}`}>Nettoyage voiture {c.nom}</Link></li>)}
        </ul>
      </section>
    </main>
  );
}
