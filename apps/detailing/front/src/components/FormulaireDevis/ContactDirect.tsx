import { useContenu } from '../../app/contenuContexte';
import { A_COMPLETER } from '../../services/contenu';
import styles from './FormulaireDevis.module.css';

/** Appel et e-mail directs, avec les coordonnées de « Mon site » ([à compléter] tant qu'elles ne sont pas saisies). */
export function ContactDirect({ sujet }: { sujet: string }) {
  const { coordonnees } = useContenu().contenu;
  const telephone = coordonnees.telephone !== A_COMPLETER && coordonnees.telephone.trim() !== '' ? coordonnees.telephone : '';
  const email = coordonnees.email.includes('@') ? coordonnees.email : '';

  return (
    <p className={styles.contacts}>
      {telephone ? <a className="btn btn--ghost" href={`tel:${telephone.replace(/[^\d+]/g, '')}`}>Appeler le {telephone}</a> : <span>Téléphone : {A_COMPLETER}</span>}
      {email ? <a className="btn btn--ghost" href={`mailto:${email}?subject=${encodeURIComponent(sujet)}`}>Écrire à {email}</a> : <span>E-mail : {A_COMPLETER}</span>}
    </p>
  );
}
