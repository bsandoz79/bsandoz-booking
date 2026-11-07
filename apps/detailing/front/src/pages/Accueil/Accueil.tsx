import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { FORMULES } from '../../data/demo';
import styles from './Accueil.module.css';

export function Accueil() {
  const autos = FORMULES.filter((f) => f.category === 'auto');
  return (
    <main>
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>Detailing auto · canapés · à domicile</p>
          <h1 className={styles.title}>Votre voiture comme neuve, sans bouger de chez vous.</h1>
          <p className={styles.lead}>Je viens à votre adresse avec tout le matériel. Réservez votre créneau en ligne en 2 minutes.</p>
          <div className={styles.ctas}>
            <Link to="/reserver" className="btn">Réserver un créneau</Link>
            <a href="#prestations" className="btn btn--ghost">Voir les prestations</a>
          </div>
          <ul className={styles.args}>
            <li>Eau et électricité autonomes</li>
            <li>Déplacement offert dans un rayon de [X] km</li>
            <li>Acompte en ligne, solde sur place</li>
          </ul>
        </div>
      </section>

      <section id="prestations" className={`container ${styles.section}`}>
        <h2>Prestations</h2>
        <div className={styles.grid}>
          {autos.map((f) => (
            <article key={f.id} className={styles.card}>
              {f.badge && <span className={styles.badge}>{f.badge}</span>}
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <p className={styles.price}>à partir de {formatEuros(Math.min(...Object.values(f.tarifs).map((t) => t.priceCents)))}</p>
            </article>
          ))}
        </div>
        <p className={styles.note}>Prix indicatifs de démonstration, ajustés selon le type de véhicule.</p>
      </section>

      <section className={`container ${styles.section}`}>
        <h2>Avis clients</h2>
        <p>[Avis Google réels à intégrer]</p>
      </section>
    </main>
  );
}
