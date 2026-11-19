import { Carte } from '@bsandoz/ui';
import assiette from './assets/assiette.webp';
import comptoir from './assets/comptoir.webp';
import salle from './assets/salle.webp';
import { Trajet } from './components/Trajet';
import { avis, carte, crocs, itineraires } from './data/crocs';
import styles from './App.module.css';

/** Site de Croc's (démo) : une seule page, de l'envie (photo, carte) au trajet. */
export function App() {
  return (
    <>
      <p className={styles.maquette}>
        Maquette proposée par <a href="https://bsandoz.fr">Baptiste Sandoz</a> · prix et horaires à confirmer avec Croc’s
      </p>

      <header className={styles.entete}>
        <a href="#haut" className={styles.logo} aria-label={`${crocs.nom}, haut de page`}>{crocs.nom}</a>
        <nav aria-label="Rubriques" className={styles.nav}>
          <a href="#carte">La carte</a>
          <a href="#venir">Venir</a>
          <a href="#avis">Avis</a>
        </nav>
        <a href={crocs.telephoneLien} className={styles.appelEntete}>Appeler</a>
      </header>

      <main id="haut">
        <section className={styles.hero} aria-labelledby="titre">
          <div className={styles.heroTexte}>
            <p className={styles.surtitre}>{crocs.activite} · Amiens</p>
            <h1 id="titre" className={styles.titre}>{crocs.nom}</h1>
            <p className={styles.accroche}>{crocs.accroche}</p>
            <div className={styles.boutons}>
              <a href={crocs.telephoneLien} className={styles.boutonJaune}>Appeler le {crocs.telephone}</a>
              <a href={itineraires.google} className={styles.boutonBlanc} target="_blank" rel="noopener noreferrer">Itinéraire</a>
            </div>
            <p className={styles.adresse}>{crocs.adresse}, {crocs.ville}</p>
          </div>
          <figure className={styles.heroPhoto}>
            <img src={assiette} alt="Assiette kebab, frites et salade" width="175" height="219" />
          </figure>
        </section>

        <section id="carte" className={styles.carte} aria-labelledby="carte-titre">
          <div className={styles.conteneur}>
            <h2 id="carte-titre" className={styles.sectionTitre}>La carte</h2>
            <Carte titre="La carte de Croc’s" rubriques={carte} />
          </div>
        </section>

        <section id="venir" className={styles.venir} aria-labelledby="venir-titre">
          <div className={`${styles.conteneur} ${styles.deuxColonnes}`}>
            <div className={styles.infos}>
              <h2 id="venir-titre" className={styles.sectionTitreRouge}>Venir chez Croc’s</h2>
              <p className={styles.adresseGrande}>{crocs.adresse}<br />{crocs.ville}</p>
              <div className={styles.liens}>
                <a href={itineraires.google} target="_blank" rel="noopener noreferrer">Google Maps</a>
                <a href={itineraires.waze} target="_blank" rel="noopener noreferrer">Waze</a>
                <a href={itineraires.plans} target="_blank" rel="noopener noreferrer">Plans (iPhone)</a>
              </div>
              <h3 className={styles.petitTitre}>Horaires</h3>
              <dl className={styles.horaires}>
                {crocs.horaires.map((h) => (
                  <div key={h.jours}>
                    <dt>{h.jours}</dt>
                    <dd>{h.heures}</dd>
                  </div>
                ))}
              </dl>
              {crocs.horairesAConfirmer && <p className={styles.discret}>Horaires relevés dans les annuaires, à confirmer.</p>}
              <p><a href={crocs.telephoneLien} className={styles.telephone}>{crocs.telephone}</a></p>
            </div>
            <Trajet />
          </div>
        </section>

        <section id="avis" className={styles.avis} aria-labelledby="avis-titre">
          <div className={styles.conteneur}>
            <h2 id="avis-titre" className={styles.sectionTitreRouge}>Ce qu’en disent les clients</h2>
            <ul className={styles.listeAvis}>
              {avis.map((a) => (
                <li key={a.auteur}>
                  <blockquote>
                    <p className={styles.etoiles} aria-label={`${a.note} sur 5`}>{'★'.repeat(a.note)}</p>
                    <p className={styles.texteAvis}>« {a.texte} »</p>
                  </blockquote>
                  <p className={styles.auteur}><strong>{a.auteur}</strong>, {a.quand}</p>
                </li>
              ))}
            </ul>
            <p className={styles.discret}>Avis publiés sur Restaurant Guru.</p>
          </div>
        </section>

        <section className={styles.photos} aria-label="La salle">
          <img src={salle} alt="La salle aux murs rouges" width="175" height="125" loading="lazy" />
          <img src={comptoir} alt="Le comptoir et la carte au mur" width="175" height="292" loading="lazy" />
        </section>
      </main>

      <footer className={styles.pied}>
        <p className={styles.logoPied}>{crocs.nom}</p>
        <p>{crocs.adresse}, {crocs.ville} · <a href={crocs.telephoneLien}>{crocs.telephone}</a></p>
        <p className={styles.discretPied}>Site réalisé par <a href="https://bsandoz.fr">Baptiste Sandoz</a></p>
      </footer>
    </>
  );
}
