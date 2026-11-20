import { Carte, Defilant } from '@bsandoz/ui';
import { Trajet } from './components/Trajet';
import { crocs, itineraires } from './data/crocs';
import { useContenu } from './hooks/useContenu';
import styles from './App.module.css';

/**
 * Photos servies par le serveur (dossier `photos/` du site), hors du dépôt public et hors du build :
 * le site se déploie depuis GitHub sans elles, et elles se changent sans redéployer. En local : `public/photos/`.
 */
const photo = (nom: string) => `/photos/${nom}.webp`;

/** Site de Croc's (démo) : une seule page, de l'envie (photo, carte) au trajet. */
export function App() {
  const { carte, accroche, horaires, horairesAConfirmer, annonce, avis, photos } = useContenu();
  return (
    <>
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
            <img src={photo('assiette')} alt="Assiettes kebab, frites et salade" width="477" height="571" />
          </figure>
        </section>

        <section id="carte" className={styles.carte} aria-labelledby="carte-titre">
          <div className={styles.conteneur}>
            <div className={styles.cadreCarte}>
              <h2 id="carte-titre" className={styles.titreCarte}>La carte</h2>
              <Carte titre="La carte de Croc’s" rubriques={carte} sommaire="Aller à une rubrique de la carte" compacte ajustee />
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

        {avis.length > 0 && <section id="avis" className={styles.avis} aria-labelledby="avis-titre">
          <div className={styles.conteneur}>
            <h2 id="avis-titre" className={styles.sectionTitreRouge}>Ce qu’en disent les clients</h2>
            {/* 3 avis à la fois ; au-delà, ils défilent d'un cran toutes les 3 secondes. */}
            <div className={styles.listeAvis}>
              <Defilant label="Avis des clients" visibles={3} intervalle={3000}>
                {avis.map((a, i) => (
                  <figure key={i} className={styles.unAvis}>
                    <blockquote>
                      <p className={styles.etoiles} aria-label={`${a.note} sur 5`}>{'★'.repeat(a.note)}</p>
                      <p className={styles.texteAvis}>« {a.texte} »</p>
                    </blockquote>
                    <figcaption className={styles.auteur}>
                      <strong>{a.auteur}</strong>{a.quand && `, ${a.quand}`}{a.source && ` · sur ${a.source}`}
                    </figcaption>
                  </figure>
                ))}
              </Defilant>
            </div>
          </div>
        </section>}

        {photos.length > 0 && (
          <section className={styles.photos} aria-label="Photos de Croc’s">
            <Defilant label="Photos de Croc’s" visibles={3} visiblesMobile={1} intervalle={3000}>
              {photos.map((p, i) => <img key={i} src={p.url} alt={p.description} loading="lazy" />)}
            </Defilant>
          </section>
        )}
      </main>

      <footer className={styles.pied}>
        <p className={styles.logoPied}>{crocs.nom}</p>
        <p>{crocs.adresse}, {crocs.ville} · <a href={crocs.telephoneLien}>{crocs.telephone}</a></p>
        <p>
          <a href="/mentions-legales" className={styles.lienPied}>Mentions légales et données personnelles</a>
          {' · '}
          <a href="/pro" className={styles.lienPied}>Espace pro</a>
        </p>
        <a href="https://bsandoz.fr" className={styles.pub}>
          <span>Site créé par <strong>Baptiste Sandoz</strong></span>
          <span>Vous aussi, un site à votre image, sans abonnement →</span>
        </a>
      </footer>
    </>
  );
}
