import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { FORMULES, type Formule } from '../../data/demo';
import { A_COMPLETER_TEXTE, SITE } from '../../data/site';
import styles from './Accueil.module.css';

const prixMin = (f: Formule) => Math.min(...Object.values(f.tarifs).map((t) => t.priceCents));

/** Réalisations : photos avant / après à fournir par l'artisan (aucune image inventée). */
const REALISATIONS = [
  { id: 'r1', titre: 'Intérieur – citadine' },
  { id: 'r2', titre: 'Complet – SUV' },
  { id: 'r3', titre: 'Canapé 3 places' },
];

const ETAPES = [
  { titre: 'Choisissez votre prestation', texte: 'Véhicule ou canapé, formule et options : le prix s’affiche tout de suite.' },
  { titre: 'Réservez un créneau', texte: 'Indiquez votre adresse, choisissez le jour et l’heure, réglez l’acompte en ligne.' },
  { titre: 'Je viens chez vous', texte: 'J’arrive avec tout le matériel. Le solde se règle sur place, une fois le travail terminé.' },
];

const FAQ = [
  { q: 'Ai-je besoin de fournir l’eau ou l’électricité ?', r: 'Non, j’arrive avec le matériel nécessaire. Il suffit d’un emplacement où garer le véhicule.' },
  { q: 'Comment fonctionne l’acompte ?', r: `Un acompte de ${SITE.depositPercent} % est demandé en ligne pour confirmer le rendez-vous. Le solde se règle sur place.` },
  { q: 'Puis-je annuler ou déplacer mon rendez-vous ?', r: `Oui, depuis le lien reçu par e-mail ou votre espace client. L’annulation est gratuite jusqu’à ${SITE.freeCancelHours} h avant le rendez-vous : l’acompte vous est alors remboursé.` },
  { q: 'Combien de temps dure une prestation ?', r: 'Cela dépend de la formule et du véhicule : la durée estimée est affichée avant de réserver. Pour un nettoyage complet, je réserve la demi-journée.' },
];

export function Accueil() {
  const autos = FORMULES.filter((f) => f.category === 'auto');
  const canape = FORMULES.find((f) => f.category === 'canape');

  return (
    <main>
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>Detailing auto · canapés · à domicile</p>
          <h1 className={styles.title}>Votre voiture comme neuve, sans bouger de chez vous.</h1>
          <p className={styles.lead}>Je viens à votre adresse avec tout le matériel. Réservez votre créneau en ligne en quelques minutes.</p>
          <div className={styles.ctas}>
            <Link to="/reserver" className="btn">Réserver un créneau</Link>
            <a href="#prestations" className="btn btn--ghost">Voir les prestations</a>
          </div>
          <ul className={styles.args}>
            <li>Matériel professionnel apporté</li>
            <li>Déplacement offert dans un rayon de {SITE.freeRadiusKm} km</li>
            <li>Acompte en ligne, solde sur place</li>
          </ul>
        </div>
      </section>

      <section id="prestations" className={`container ${styles.section}`} aria-labelledby="titre-prestations">
        <h2 id="titre-prestations">Prestations</h2>
        <div className={styles.grid}>
          {autos.map((f) => (
            <article key={f.id} className={styles.card}>
              {f.badge && <span className={styles.badge}>{f.badge}</span>}
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <p className={styles.price}>à partir de {formatEuros(prixMin(f))}</p>
            </article>
          ))}
        </div>
        {canape && (
          <article className={`${styles.card} ${styles.wide}`}>
            <h3>{canape.name}</h3>
            <p>{canape.description}</p>
            <p className={styles.price}>à partir de {formatEuros(prixMin(canape))}</p>
          </article>
        )}
        <p className={styles.note}>Prix indicatifs de démonstration, ajustés selon le type de véhicule ou le nombre de places.</p>
        <Link to="/reserver" className={`btn ${styles.selfStart}`}>Calculer mon prix</Link>
      </section>

      <section className={styles.band} aria-labelledby="titre-etapes">
        <div className={`container ${styles.section}`}>
          <h2 id="titre-etapes">Comment ça marche</h2>
          <ol className={styles.steps}>
            {ETAPES.map((e) => (
              <li key={e.titre} className={styles.step}>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="realisations" className={`container ${styles.section}`} aria-labelledby="titre-realisations">
        <h2 id="titre-realisations">Réalisations</h2>
        <div className={styles.grid}>
          {REALISATIONS.map((r) => (
            <figure key={r.id} className={styles.realisation}>
              <div className={styles.beforeAfter}>
                <div className={styles.photo}><span>Avant</span><span>{A_COMPLETER_TEXTE}</span></div>
                <div className={styles.photo}><span>Après</span><span>{A_COMPLETER_TEXTE}</span></div>
              </div>
              <figcaption>{r.titre}</figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.note}>Photos avant / après à fournir.</p>
      </section>

      <section id="zone" className={styles.band} aria-labelledby="titre-zone">
        <div className={`container ${styles.section}`}>
          <h2 id="titre-zone">Zone d’intervention</h2>
          <p>
            Je me déplace autour de <strong>{SITE.city}</strong> : le déplacement est offert jusqu’à {SITE.freeRadiusKm} km, puis facturé{' '}
            {formatEuros(SITE.pricePerKmCents)} par km au-delà, dans la limite de {SITE.maxDistanceKm} km.
          </p>
          <p>Le prix exact du déplacement est calculé automatiquement à partir de votre adresse lors de la réservation.</p>
        </div>
      </section>

      <section id="avis" className={`container ${styles.section}`} aria-labelledby="titre-avis">
        <h2 id="titre-avis">Avis clients</h2>
        <p>{A_COMPLETER_TEXTE}</p>
        <p className={styles.note}>Seuls des avis réels et vérifiables seront publiés ici.</p>
      </section>

      <section id="faq" className={styles.band} aria-labelledby="titre-faq">
        <div className={`container ${styles.section}`}>
          <h2 id="titre-faq">Questions fréquentes</h2>
          <div className={styles.faq}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.question}>
                <summary>{item.q}</summary>
                <p>{item.r}</p>
              </details>
            ))}
          </div>
          <Link to="/reserver" className={`btn ${styles.selfStart}`}>Réserver un créneau</Link>
        </div>
      </section>
    </main>
  );
}
