import { Cadre } from './components/Cadre';
import { Image } from './components/Image';
import {
  accueil, cabinet, contact, domaines, honoraires, juridictions, parcours, procedure, urgence,
} from './data/cabinet';
import styles from './App.module.css';

/** Icônes au trait des blocs de contact. */
const ICONES = {
  telephone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  email: 'M3 6h18v12H3z M3 7l9 6 9-6',
  adresse: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  horaires: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
};

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.icone} aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnTeteSection({ surtitre, titre, id }: { surtitre: string; titre: string; id: string }) {
  return (
    <>
      <p className={styles.surtitre}>{surtitre}</p>
      <h2 id={id} className={styles.titreSection}>{titre}</h2>
    </>
  );
}

/**
 * Accueil : une seule page (cabinet, domaines, procédure, juridictions, honoraires, contact), menu par ancres.
 * Photos des palais de justice d'Abbeville et d'Amiens.
 */
export function App() {
  return (
    <Cadre surAccueil>
      <section id="cabinet" className={styles.hero} aria-labelledby="titre-cabinet">
        <div className={styles.heroTexte}>
          <p className={styles.surtitre}>{accueil.surtitre}</p>
          <h1 id="titre-cabinet" className={styles.nom}>{cabinet.titre}</h1>
          <p className={styles.sousTitre}>{cabinet.sousTitre}</p>
          {accueil.paragraphes.map((p) => <p key={p}>{p}</p>)}
          <div className={styles.boutons}>
            <a href="#contact" className={styles.bouton}>{accueil.boutonRdv}</a>
            <a href="#domaines" className={styles.boutonSecondaire}>{accueil.boutonDomaines}</a>
          </div>
        </div>
        <figure className={styles.heroPhoto}>
          <Image photo={accueil.photo} sizes="(min-width: 56rem) 28rem, 100vw" prioritaire />
        </figure>
      </section>

      <aside className={styles.urgence} aria-labelledby="titre-urgence">
        <div className={styles.urgenceInterieur}>
          <h2 id="titre-urgence">{urgence.titre}</h2>
          <p>{urgence.texte}</p>
          <a href={cabinet.telephoneLien} className={styles.urgenceLien}>
            {urgence.lien} : {cabinet.telephone} <span className={styles.fictif}>(fictif)</span>
          </a>
        </div>
      </aside>

      <section id="parcours" className={styles.section} aria-labelledby="titre-parcours">
        <div className={styles.parcours}>
          <div>
            <EnTeteSection surtitre={parcours.surtitre} titre={parcours.titre} id="titre-parcours" />
            {parcours.paragraphes.map((p) => <p key={p}>{p}</p>)}
            <figure className={styles.serment}>
              <blockquote><p>« {parcours.serment} »</p></blockquote>
              <figcaption>{parcours.sermentSource}</figcaption>
            </figure>
            <p className={styles.note}>{parcours.precision}</p>
            <p className={styles.note}>{parcours.note}</p>
          </div>
          <figure className={styles.photoCadre}>
            <Image photo={parcours.photo} sizes="(min-width: 56rem) 26rem, 100vw" />
            <figcaption>La collégiale Saint-Vulfran, au cœur d’Abbeville.</figcaption>
          </figure>
        </div>
      </section>

      <section id="domaines" className={`${styles.section} ${styles.sectionClaire}`} aria-labelledby="titre-domaines">
        <div className={styles.interieur}>
          <EnTeteSection surtitre={domaines.surtitre} titre={domaines.titre} id="titre-domaines" />
          <ul className={styles.domaines}>
            {domaines.liste.map((d) => (
              <li key={d.numero} className={styles.domaine}>
                <span className={styles.numero} aria-hidden="true">{d.numero}</span>
                <h3>{d.titre}</h3>
                <p className={styles.domaineIntro}>{d.intro}</p>
                <ul className={styles.points}>
                  {d.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="procedure" className={styles.section} aria-labelledby="titre-procedure">
        <div className={styles.interieur}>
          <EnTeteSection surtitre={procedure.surtitre} titre={procedure.titre} id="titre-procedure" />
          <p className={styles.introSection}>{procedure.intro}</p>
          <ol className={styles.etapes}>
            {procedure.etapes.map((e) => (
              <li key={e.titre}>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="juridictions" className={`${styles.section} ${styles.sectionSombre}`} aria-labelledby="titre-juridictions">
        <div className={styles.interieur}>
          <EnTeteSection surtitre={juridictions.surtitre} titre={juridictions.titre} id="titre-juridictions" />
          <ul className={styles.juridictions}>
            {juridictions.liste.map((j) => (
              <li key={j.nom}>
                <Image photo={j.photo} sizes="(min-width: 56rem) 23rem, 100vw" />
                <p className={styles.lieu}>{j.lieu}</p>
                <h3>{j.nom}</h3>
                <p>{j.texte}</p>
              </li>
            ))}
          </ul>
          <p className={styles.noteClaire}>{juridictions.note}</p>
        </div>
      </section>

      <section id="honoraires" className={`${styles.section} ${styles.sectionClaire}`} aria-labelledby="titre-honoraires">
        <div className={styles.interieur}>
          <EnTeteSection surtitre={honoraires.surtitre} titre={honoraires.titre} id="titre-honoraires" />
          <dl className={styles.honoraires}>
            {honoraires.points.map((h) => (
              <div key={h.titre}>
                <dt>{h.titre}</dt>
                <dd>{h.texte}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="contact" className={styles.section} aria-labelledby="titre-contact">
        <div className={styles.interieur}>
          <EnTeteSection surtitre={contact.surtitre} titre={contact.titre} id="titre-contact" />
          <p className={styles.introSection}>{contact.intro}</p>
          <ul className={styles.coordonnees}>
            <li>
              <Icone d={ICONES.telephone} />
              <h3>Téléphone</h3>
              <p><a href={cabinet.telephoneLien}>{cabinet.telephone}</a> <span className={styles.fictif}>(fictif)</span></p>
            </li>
            <li>
              <Icone d={ICONES.email} />
              <h3>E-mail</h3>
              <p><a href={`mailto:${cabinet.email}`}>{cabinet.email}</a> <span className={styles.fictif}>(fictif)</span></p>
            </li>
            <li>
              <Icone d={ICONES.adresse} />
              <h3>Adresse</h3>
              <p>{cabinet.adresse}<br />{cabinet.ville} <span className={styles.fictif}>({cabinet.adresseNote})</span></p>
            </li>
            <li>
              <Icone d={ICONES.horaires} />
              <h3>Horaires</h3>
              <p>{cabinet.horaires}</p>
            </li>
          </ul>
        </div>
      </section>
    </Cadre>
  );
}
