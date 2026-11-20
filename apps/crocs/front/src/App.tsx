import { Carte, Defilant } from '@bsandoz/ui';
import { Trajet } from './components/Trajet';
import { avis, crocs, itineraires } from './data/crocs';
import { useContenu } from './hooks/useContenu';
import styles from './App.module.css';

/**
 * Photos servies par le serveur (dossier `photos/` du site), hors du dépôt public et hors du build :
 * le site se déploie depuis GitHub sans elles, et elles se changent sans redéployer. En local : `public/photos/`.
 */
const photo = (nom: string) => `/photos/${nom}.webp`;

/** Site de Croc's (démo) : une seule page, de l'envie (photo, carte) au trajet. */
export function App() {
  const { carte, accroche, horaires, horairesAConfirmer, annonce } = useContenu();
  return (
    <>
      <p className={styles.maquette}>
        Maquette proposée par <a href="https://bsandoz.fr">Baptiste Sandoz</a> · prix et horaires à confirmer avec Croc’s
      </p>

      {annonce && <p className={styles.annonce} role="status">{annonce}</p>}

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
            <p className={styles.accroche}>{accroche}</p>
            <div className={styles.boutons}>
              <a href={crocs.telephoneLien} className={styles.boutonJaune}>Appeler le {crocs.telephone}</a>
              <a href={itineraires.google} className={styles.boutonBlanc} target="_blank" rel="noopener noreferrer">Itinéraire</a>
            </div>
            <p className={styles.adresse}>{crocs.adresse}, {crocs.ville}</p>
          </div>
          <figure className={styles.heroPhoto}>
            <img src={photo('assiette')} alt="Assiette kebab, frites et salade" width="175" height="219" />
          </figure>
        </section>

        <section id="carte" className={styles.carte} aria-labelledby="carte-titre">
          <div className={styles.conteneur}>
            <div className={styles.cadreCarte}>
              <h2 id="carte-titre" className={styles.titreCarte}>La carte</h2>
              <Carte titre="La carte de Croc’s" rubriques={carte} sommaire="Aller à une rubrique de la carte" compacte />
            </div>
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
                {horaires.map((h) => (
                  <div key={h.jours}>
                    <dt>{h.jours}</dt>
                    <dd>{h.heures}</dd>
                  </div>
                ))}
              </dl>
              {horairesAConfirmer && <p className={styles.discret}>Horaires relevés dans les annuaires, à confirmer.</p>}
              <p><a href={crocs.telephoneLien} className={styles.telephone}>{crocs.telephone}</a></p>
            </div>
            <Trajet />
          </div>
        </section>

        <section id="avis" className={styles.avis} aria-labelledby="avis-titre">
          <div className={styles.conteneur}>
            <h2 id="avis-titre" className={styles.sectionTitreRouge}>Ce qu’en disent les clients</h2>
            {/* 3 avis à la fois ; au-delà, ils défilent d'un cran toutes les 3 secondes. */}
            <div className={styles.listeAvis}>
              <Defilant label="Avis des clients" visibles={3} intervalle={3000}>
                {avis.map((a) => (
                  <figure key={a.auteur} className={styles.unAvis}>
                    <blockquote>
                      <p className={styles.etoiles} aria-label={`${a.note} sur 5`}>{'★'.repeat(a.note)}</p>
                      <p className={styles.texteAvis}>« {a.texte} »</p>
                    </blockquote>
                    <figcaption className={styles.auteur}><strong>{a.auteur}</strong>, {a.quand}</figcaption>
                  </figure>
                ))}
              </Defilant>
            </div>
            <p className={styles.discret}>Avis publiés sur Restaurant Guru.</p>
          </div>
        </section>

        <section className={styles.photos} aria-label="La salle">
          <img src={photo('salle')} alt="La salle aux murs rouges" width="175" height="125" loading="lazy" />
          <img src={photo('comptoir')} alt="Le comptoir et la carte au mur" width="175" height="292" loading="lazy" />
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
