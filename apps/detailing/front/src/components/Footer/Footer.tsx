import { ModifierRubrique, Zone } from '../ModeEdition';
import { Link } from 'react-router-dom';
import { useContenu } from '../../app/contenuContexte';
import { SITE } from '../../data/site';
import { A_COMPLETER } from '../../services/contenu';
import styles from './Footer.module.css';

/** Pied de page : coordonnées modifiables dans l'espace pro (« Mon site »). Liens tel: / mailto: dès qu'elles sont renseignées. */
export function Footer() {
  const { coordonnees } = useContenu().contenu;
  const telephone = coordonnees.telephone !== A_COMPLETER && coordonnees.telephone !== ''
    ? <a href={`tel:${coordonnees.telephone.replace(/[^\d+]/g, '')}`}>{coordonnees.telephone}</a> : coordonnees.telephone;
  const email = coordonnees.email.includes('@') ? <a href={`mailto:${coordonnees.email}`}>{coordonnees.email}</a> : coordonnees.email;

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div><strong>{SITE.brand}</strong><p>{SITE.activity} · {coordonnees.adresse || SITE.city} et alentours</p></div>
        <Zone crayons={<ModifierRubrique rubrique="coordonnees" />}><div className={styles.coordonnees}><p>Téléphone : {telephone} · E-mail : {email}</p><p>Horaires : {coordonnees.horaires}</p></div></Zone>
        <nav aria-label="Liens légaux" className={styles.legal}>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/cgv">CGV</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
