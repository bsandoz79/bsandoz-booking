import { useState, type ReactNode } from 'react';
import { cabinet, menu, piedDePage } from '../data/cabinet';
import styles from './Cadre.module.css';

/** Monogramme du cabinet (initiales dans un cercle), dessiné en code. */
export function Monogramme() {
  return (
    <svg viewBox="0 0 48 48" className={styles.monogramme} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <text x="24" y="30.5" textAnchor="middle" fontSize="17" fontFamily="Georgia, 'Times New Roman', serif" fill="currentColor">BS</text>
    </svg>
  );
}

/** Lien du menu : ancre de l'accueil, ou accueil + ancre depuis une page légale. */
const lien = (ancre: string, surAccueil: boolean) => (surAccueil ? `#${ancre}` : `/#${ancre}`);

/**
 * Cadre commun à toutes les pages : bandeau « site fictif », en-tête (monogramme, nom, menu) et pied de page.
 * Sur téléphone, le menu se replie derrière un bouton.
 */
export function Cadre({ children, surAccueil = false }: { children: ReactNode; surAccueil?: boolean }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  return (
    <>
      <a href="#contenu" className={styles.evitement}>Aller au contenu</a>
      <p className={styles.bandeau} role="note">
        {cabinet.bandeau} <a href={cabinet.createurLien}>bsandoz.fr</a>
      </p>
      <header className={styles.entete}>
        <div className={styles.enteteInterieur}>
          <a href={surAccueil ? '#cabinet' : '/'} className={styles.marque}>
            <Monogramme />
            <span>
              <span className={styles.marqueNom}>{cabinet.nom}</span>
              <span className={styles.marqueRole}>{cabinet.profession}</span>
            </span>
          </a>
          <button
            type="button"
            className={styles.boutonMenu}
            aria-expanded={menuOuvert}
            aria-controls="menu-principal"
            onClick={() => setMenuOuvert((o) => !o)}
          >
            {menuOuvert ? 'Fermer' : 'Menu'}
          </button>
          <nav id="menu-principal" aria-label="Menu principal" className={menuOuvert ? `${styles.menu} ${styles.menuOuvert}` : styles.menu}>
            <ul>
              {menu.map((m) => (
                <li key={m.ancre}>
                  <a href={lien(m.ancre, surAccueil)} onClick={() => setMenuOuvert(false)}>{m.libelle}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="contenu">{children}</main>
      <footer className={styles.pied}>
        <div className={styles.piedInterieur}>
          <div className={styles.piedMarque}>
            <Monogramme />
            <p>
              <strong>{cabinet.titre}</strong>
              <br />
              {cabinet.sousTitre}
            </p>
          </div>
          <nav aria-label="Plan du site">
            <ul className={styles.piedMenu}>
              {menu.map((m) => (
                <li key={m.ancre}><a href={lien(m.ancre, surAccueil)}>{m.libelle}</a></li>
              ))}
            </ul>
          </nav>
          <p className={styles.piedCoordonnees}>
            {cabinet.adresse}, {cabinet.ville} ({cabinet.adresseNote})
            <br />
            <a href={cabinet.telephoneLien}>{cabinet.telephone}</a> (fictif)
          </p>
        </div>
        <div className={styles.piedBas}>
          <p>{piedDePage.avertissement}</p>
          <p>
            <a href="/mentions-legales">Mentions légales</a>
            {' · '}
            <a href="/confidentialite">Politique de confidentialité</a>
            {' · '}
            {piedDePage.realisation} : <a href={cabinet.createurLien}>bsandoz.fr</a>
          </p>
        </div>
      </footer>
    </>
  );
}
