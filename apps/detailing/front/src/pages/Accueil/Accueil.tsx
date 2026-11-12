import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { useContenu } from '../../app/contenuContexte';
import { CATEGORIES, FORMULES, prixMin, type Formule } from '../../data/demo';
import { SITE } from '../../data/site';
import { lignesTarifDeplacement, type ZonePublique } from '../../data/zone';
import { getCatalog, getZone } from '../../services/api';
import { A_COMPLETER } from '../../services/contenu';
import styles from './Accueil.module.css';

/** Accueil : textes, étapes, réalisations, avis, FAQ et communes modifiables dans l'espace pro (« Mon site »). */
export function Accueil() {
  const { contenu } = useContenu();
  // Catalogue réel (API) dès qu'il est chargé ; données de démonstration en attendant ou si l'API ne répond pas.
  const [formules, setFormules] = useState<Formule[]>(FORMULES);
  useEffect(() => { getCatalog().then((c) => { if (c.formules.length > 0) setFormules(c.formules); }).catch(() => undefined); }, []);
  const [zone, setZone] = useState<ZonePublique>();
  useEffect(() => { getZone().then(setZone).catch(() => undefined); }, []);

  const { accueil, etapes, faq, avis, realisations, communes } = contenu;
  const avisPublies = avis.filter((a) => a.texte.trim() !== '');

  return (
    <main>
      <section className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>{accueil.surtitre}</p>
          <h1 className={styles.title}>{accueil.titre}</h1>
          <p className={styles.lead}>{accueil.introduction}</p>
          <div className={styles.ctas}>
            <Link to="/reserver" className="btn">Réserver un créneau</Link>
            <a href="#prestations" className="btn btn--ghost">Voir les prestations</a>
          </div>
          {accueil.arguments.length > 0 && (
            <ul className={styles.args}>
              {accueil.arguments.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
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

      {etapes.length > 0 && (
        <section className={styles.band} aria-labelledby="titre-etapes">
          <div className={`container ${styles.section}`}>
            <h2 id="titre-etapes">Comment ça marche</h2>
            <ol className={styles.steps}>
              {etapes.map((e, i) => (
                <li key={`${i}-${e.titre}`} className={styles.step}>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section id="realisations" className={`container ${styles.section}`} aria-labelledby="titre-realisations">
        <h2 id="titre-realisations">Réalisations</h2>
        <div className={styles.grid}>
          {realisations.map((r, i) => (
            <figure key={`${i}-${r.titre}`} className={styles.realisation}>
              <div className={styles.beforeAfter}>
                {(['avant', 'apres'] as const).map((moment) => (r[moment] ? (
                  <img key={moment} src={r[moment]} alt={`${r.titre} – ${moment === 'avant' ? 'avant' : 'après'}`} className={styles.image} loading="lazy" />
                ) : (
                  <div key={moment} className={styles.photo}><span>{moment === 'avant' ? 'Avant' : 'Après'}</span><span>{A_COMPLETER}</span></div>
                )))}
              </div>
              <figcaption>{r.titre}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="zone" className={styles.band} aria-labelledby="titre-zone">
        <div className={`container ${styles.section}`}>
          <h2 id="titre-zone">Zone d’intervention</h2>
          {zone?.surPlace ? (
            <p>Les prestations se font sur place, à <strong>{SITE.city}</strong>.</p>
          ) : (
            <>
              <p>Je me déplace autour de <strong>{SITE.city}</strong>{zone ? `, jusqu’à ${String(zone.maxDistanceKm).replace('.', ',')} km` : ''}. Frais de déplacement :</p>
              {zone && <ul className={styles.tarifs}>{lignesTarifDeplacement(zone).map((l) => <li key={l}>{l}</li>)}</ul>}
            </>
          )}
          {communes.length > 0 && <p>Communes desservies : {communes.join(', ')}.</p>}
          <p>Le prix exact du déplacement est calculé automatiquement à partir de votre adresse lors de la réservation.</p>
        </div>
      </section>

      <section id="avis" className={`container ${styles.section}`} aria-labelledby="titre-avis">
        <h2 id="titre-avis">Avis clients</h2>
        {avisPublies.length === 0 ? (
          <>
            <p>{A_COMPLETER}</p>
            <p className={styles.note}>Seuls des avis réels et vérifiables seront publiés ici.</p>
          </>
        ) : (
          <div className={styles.grid}>
            {avisPublies.map((a, i) => (
              <blockquote key={`${i}-${a.auteur}`} className={styles.card}>
                <p className={styles.etoiles} aria-label={`Note : ${a.note} sur 5`}>{'★'.repeat(Math.max(0, Math.min(5, a.note)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, a.note)))}</p>
                <p>« {a.texte} »</p>
                <footer className={styles.note}>{a.auteur}{a.date ? ` · ${a.date}` : ''}</footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      {faq.length > 0 && (
        <section id="faq" className={styles.band} aria-labelledby="titre-faq">
          <div className={`container ${styles.section}`}>
            <h2 id="titre-faq">Questions fréquentes</h2>
            <div className={styles.faq}>
              {faq.map((item, i) => (
                <details key={`${i}-${item.question}`} className={styles.question}>
                  <summary>{item.question}</summary>
                  <p>{item.reponse}</p>
                </details>
              ))}
            </div>
            <Link to="/reserver" className={`btn ${styles.selfStart}`}>Réserver un créneau</Link>
          </div>
        </section>
      )}
    </main>
  );
}
