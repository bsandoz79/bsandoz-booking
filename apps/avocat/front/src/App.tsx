import { Balance } from './components/Balance';
import { Cadre } from './components/Cadre';
import { accueil, cabinet, contact, domaines, parcours } from './data/cabinet';
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

/** Accueil : une seule page (cabinet, parcours, domaines d'intervention, contact), menu par ancres. */
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
        <div className={styles.heroIllustration}>
          <Balance className={styles.balance} />
        </div>
      </section>

      <section id="parcours" className={styles.section} aria-labelledby="titre-parcours">
        <div className={styles.interieurEtroit}>
          <EnTeteSection surtitre={parcours.surtitre} titre={parcours.titre} id="titre-parcours" />
          {parcours.paragraphes.map((p) => <p key={p}>{p}</p>)}
          <p className={styles.note}>{parcours.note}</p>
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
                <ul className={styles.points}>
                  {d.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className={styles.section} aria-labelledby="titre-contact">
        <div className={styles.interieur}>
          <EnTeteSection surtitre={contact.surtitre} titre={contact.titre} id="titre-contact" />
          <p className={styles.introContact}>{contact.intro}</p>
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
