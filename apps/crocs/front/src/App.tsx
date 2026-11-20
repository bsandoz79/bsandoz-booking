import { useState } from 'react';
import { Carte, Defilant, Visionneuse } from '@bsandoz/ui';
import { Logo } from './components/Logo';
import { Trajet } from './components/Trajet';
import { crocs, itineraires } from './data/crocs';
import { useContenu } from './hooks/useContenu';
import styles from './App.module.css';

/**
 * Photos servies par le serveur (dossier `photos/` du site), hors du dépôt public et hors du build :
 * le site se déploie depuis GitHub sans elles, et elles se changent sans redéployer. En local : `public/photos/`.
 */
const photo = (nom: string) => `/photos/${nom}.webp`;

/** Vignettes affichées en bas de page ; au-delà, la dernière indique combien il en reste. */
const PHOTOS_VISIBLES = 6;

/** Site de Croc's (démo) : une seule page, de l'envie (photo, carte) au trajet. */
export function App() {
  const { carte, accroche, horaires, horairesAConfirmer, annonce, avis, photos } = useContenu();
  // Photos qui s'agrandissent au clic : la photo principale, puis celles du bas de page.
  const galerie = [{ url: photo('assiette'), description: 'Assiettes kebab, frites et salade' }, ...photos];
  const [agrandie, setAgrandie] = useState<number | null>(null);
  return (
    <>
      {annonce && <p className={styles.annonce} role="status">{annonce}</p>}

      <header className={styles.entete}>
        <a href="#haut" className={styles.logo} aria-label={`${crocs.nom}, haut de page`}><Logo decoratif /></a>
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
            <h1 id="titre" className={styles.titre}><Logo /></h1>
            <p className={styles.accroche}>{accroche}</p>
            <div className={styles.boutons}>
              <a href={crocs.telephoneLien} className={styles.boutonJaune}>Appeler le {crocs.telephone}</a>
              <a href={itineraires.google} className={styles.boutonBlanc} target="_blank" rel="noopener noreferrer">Itinéraire</a>
            </div>
            <p className={styles.adresse}>{crocs.adresse}, {crocs.ville}</p>
          </div>
          <figure className={styles.heroPhoto}>
            <button type="button" className={styles.agrandir} onClick={() => setAgrandie(0)} aria-label={`Agrandir la photo : ${galerie[0].description}`}>
              <img src={galerie[0].url} alt="" width="477" height="571" />
            </button>
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
          // Galerie fixe (seuls les avis défilent) : 6 vignettes au plus, la dernière ouvre la suite dans la visionneuse.
          <section className={styles.photos} aria-label="Photos de Croc’s">
            <ul className={styles.galerie}>
              {photos.slice(0, PHOTOS_VISIBLES).map((p, i) => {
                const reste = i === PHOTOS_VISIBLES - 1 ? photos.length - PHOTOS_VISIBLES : 0;
                return (
                  <li key={i}>
                    <button type="button" className={styles.agrandir} onClick={() => setAgrandie(i + 1)}
                      aria-label={reste > 0 ? `Voir les ${photos.length} photos, à partir de : ${p.description}` : `Agrandir la photo : ${p.description}`}>
                      <img src={p.url} alt="" />
                      {reste > 0 && <span className={styles.reste} aria-hidden="true">+{reste}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <Visionneuse photos={galerie} index={agrandie} onChange={setAgrandie} onClose={() => setAgrandie(null)} />

      <footer className={styles.pied}>
        <div className={styles.piedCommerce}>
          <p className={styles.logoPied}><Logo /></p>
          <p>{crocs.adresse}, {crocs.ville} · <a href={crocs.telephoneLien}>{crocs.telephone}</a></p>
        </div>
        <nav className={styles.piedLiens} aria-label="Informations">
          <a href="/mentions-legales" className={styles.lienPied}>Mentions légales et données personnelles</a>
          <a href="/pro" className={styles.lienPied}>Espace pro</a>
        </nav>
        <a href="https://bsandoz.fr" className={styles.pub}>
          <span>Site créé par <strong>Baptiste Sandoz</strong></span>
          <span>Vous aussi, un site à votre image, sans abonnement →</span>
        </a>
      </footer>
    </>
  );
}
