import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div><strong>Atelier Brillance</strong><p>Detailing auto et canapés à domicile · [zone à compléter]</p></div>
        <div><p>[téléphone] · [e-mail]</p><p>Horaires : [à compléter]</p></div>
        <nav aria-label="Liens légaux" className={styles.legal}>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/cgv">CGV</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
