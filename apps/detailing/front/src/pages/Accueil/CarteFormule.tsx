import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatEuros } from '@bsandoz/ui';
import { prixMin, type Formule } from '../../data/demo';
import { detailPrestation } from '../../data/vitrine';
import { Icone } from '../../components/Icone/Icone';
import styles from './Accueil.module.css';

/**
 * Carte d'une formule telle qu'affichée sur l'accueil : badge, prix « à partir de », durée, ce qui est compris (avec
 * étiquettes) et bouton « Choisir ». Sert aussi d'aperçu en direct dans le catalogue de l'espace pro (`apercu`).
 */
export function CarteFormule({ formule: f, enEdition = false, crayon, apercu = false, rang = 0 }: {
  formule: Formule; enEdition?: boolean; crayon?: ReactNode; apercu?: boolean;
  /** Place dans la liste : décale l'apparition (cascade). */
  rang?: number;
}) {
  const detail = detailPrestation(f.description);
  return (
    <article className={`${styles.formule} ${f.badge ? styles.vedette : ''} ${enEdition || apercu ? styles.enEdition : ''}`}
      {...(apercu ? {} : { 'data-apparition': true, style: { '--delai': `${rang * 90}ms` } as CSSProperties })}>
      {f.badge && <span className={styles.badge}>{f.badge}</span>}
      {crayon && <div className={styles.crayonCarte}>{crayon}</div>}
      <h3>{f.name || 'Nom de la formule'}</h3>
      <p className={styles.prix}>{formatEuros(prixMin(f))}</p>
      {detail.duree && <p className={styles.duree}><Icone nom="horloge" taille={16} /> {detail.duree}</p>}
      {detail.inclus.length > 0 ? (
        <>
          <p className={styles.compris}>Ce qui est compris</p>
          <ul className={styles.inclus}>
            {detail.elements.map((e, i) => (
              <li key={`${i}-${e.texte}`} className={e.formule ? styles.formuleIncluse : undefined}>
                {e.texte}
                {e.etiquette && <span className={`${styles.etiquette} ${/offert/i.test(e.etiquette) ? styles.etiquetteOfferte : ''}`}>{e.etiquette}</span>}
              </li>
            ))}
          </ul>
        </>
      ) : <p>{detail.texte}</p>}
      {apercu ? (
        <span className={`btn ${f.badge ? '' : 'btn--ghost'} ${styles.choisir}`} aria-hidden="true">Choisir</span>
      ) : (
        <Link to={`/reserver?formule=${encodeURIComponent(f.id)}`} className={`btn ${f.badge ? '' : 'btn--ghost'} ${styles.choisir}`} aria-label={`Choisir ${f.name}`}>
          Choisir
        </Link>
      )}
    </article>
  );
}
