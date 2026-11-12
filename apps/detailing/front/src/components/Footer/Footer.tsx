import { Link } from 'react-router-dom';
import { SITE } from '../../data/site';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div><strong>{SITE.brand}</strong><p>{SITE.activity} · {SITE.city} et alentours ({SITE.freeRadiusKm} km offerts)</p></div>
        <div><p>Téléphone : {SITE.phone} · E-mail : {SITE.email}</p><p>Horaires : {SITE.hours}</p></div>
        <nav aria-label="Liens légaux" className={styles.legal}>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/cgv">CGV</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
