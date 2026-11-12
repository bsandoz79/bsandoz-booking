import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { CATEGORIES, FORMULES, prixMin, type Formule } from '../../data/demo';
import { getCatalog } from '../../services/api';
import { A_COMPLETER_TEXTE, SITE } from '../../data/site';
import styles from './Accueil.module.css';

/** Réalisations : photos avant / après à fournir par l'artisan (aucune image inventée). */
const REALISATIONS = [
  { id: 'r1', titre: 'Intérieur Signature' },
  { id: 'r2', titre: 'Extérieur Excellence' },
  { id: 'r3', titre: 'Rénovation des phares' },
];

const ETAPES = [
  { titre: 'Choisissez votre prestation', texte: 'Intérieur, extérieur, phares ou soin à la carte : le prix s’affiche tout de suite, le même pour tous les véhicules.' },
  { titre: 'Réservez un créneau', texte: 'Indiquez votre adresse, choisissez le jour et l’heure, réglez l’acompte en ligne.' },
  { titre: 'Je viens chez vous', texte: 'J’arrive avec tout le matériel. Le solde se règle sur place, une fois le travail terminé.' },
];

const FAQ = [
  { q: 'Ai-je besoin de fournir l’eau ou l’électricité ?', r: 'Non, j’arrive avec le matériel nécessaire. Il suffit d’un emplacement où garer le véhicule.' },
  { q: 'Comment fonctionne l’acompte ?', r: `Un acompte de ${SITE.depositPercent} % est demandé en ligne pour confirmer le rendez-vous. Le solde se règle sur place.` },
  { q: 'Puis-je annuler ou déplacer mon rendez-vous ?', r: `Oui, depuis le lien reçu par e-mail ou votre espace client. L’annulation est gratuite jusqu’à ${SITE.freeCancelHours} h avant le rendez-vous : l’acompte vous est alors remboursé.` },
  { q: 'Combien de temps dure une prestation ?', r: 'Cela dépend de la formule et de l’état du véhicule : de 1 h pour un Éclat à 5 h pour une Excellence. Pour les formules longues, je réserve la demi-journée.' },
];

export function Accueil() {
  // Catalogue réel (API) dès qu'il est chargé ; données de démonstration en attendant ou si l'API ne répond pas.
  const [formules, setFormules] = useState<Formule[]>(FORMULES);
  useEffect(() => { getCatalog().then((c) => { if (c.formules.length > 0) setFormules(c.formules); }).catch(() => undefined); }, []);


  return (
    <main>
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>Nettoyage auto à domicile · Abbeville et alentours</p>
          <h1 className={styles.title}>Votre voiture comme neuve, sans bouger de chez vous.</h1>
          <p className={styles.lead}>Nettoyage intérieur et extérieur, rénovation des phares : je viens à votre adresse, autonome en eau et en électricité. Réservez votre créneau en ligne en quelques minutes.</p>
          <div className={styles.ctas}>
            <Link to="/reserver" className="btn">Réserver un créneau</Link>
            <a href="#prestations" className="btn btn--ghost">Voir les prestations</a>
          </div>
          <ul className={styles.args}>
            <li>Autonome en eau et en électricité</li>
            <li>Déplacement offert dans un rayon de {SITE.freeRadiusKm} km</li>
            <li>Acompte en ligne, solde sur place</li>
          </ul>
        </div>
      </section>

      <section id="prestations" className={`container ${styles.section}`} aria-labelledby="titre-prestations">
        <h2 id="titre-prestations">Prestations</h2>
        {CATEGORIES.filter((c) => formules.some((f) => f.category === c.value)).map((c) => (
          <div key={c.value} className={styles.categorie}>
            <h3>{c.label}</h3>
            <p className={styles.note}>{c.description}</p>
            <div className={styles.grid}>
              {formules.filter((f) => f.category === c.value).map((f) => (
                <article key={f.id} className={styles.card}>
                  {f.badge && <span className={styles.badge}>{f.badge}</span>}
                  <h4>{f.name}</h4>
                  <p>{f.description}</p>
                  <p className={styles.price}>{formatEuros(prixMin(f))}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
        <p className={styles.note}>Supplément de 10 € pour les poils d’animaux ou un véhicule très sale. Même prix quel que soit le véhicule.</p>
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
