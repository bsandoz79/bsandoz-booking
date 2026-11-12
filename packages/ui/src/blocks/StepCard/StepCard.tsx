import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './StepCard.module.css';

export type StepCardStatus = 'active' | 'done' | 'upcoming';

export interface StepCardProps {
  /** Numéro affiché dans la pastille. */
  number: number;
  title: string;
  status: StepCardStatus;
  /** Résumé du choix, affiché quand l'étape est terminée. */
  summary?: ReactNode;
  /** Rouvre l'étape terminée. */
  onEdit?: () => void;
  editLabel?: string;
  /** Contenu de l'étape, affiché seulement quand elle est active. */
  children?: ReactNode;
}

/**
 * Étape d'un parcours en accordéon : active (contenu ouvert), terminée (repliée avec son résumé et « Modifier »),
 * ou à venir (grisée). Quand une étape devient active, le focus passe sur son titre.
 */
export function StepCard({ number, title, status, summary, onEdit, editLabel = 'Modifier', children }: StepCardProps) {
  const id = useId();
  const titre = useRef<HTMLHeadingElement>(null);
  const precedent = useRef(status);

  useEffect(() => {
    if (status === 'active' && precedent.current !== 'active') {
      titre.current?.focus();
      titre.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    }
    precedent.current = status;
  }, [status]);

  if (status === 'done') {
    return (
      <section className={`${styles.card} ${styles.ligne}`} aria-labelledby={id}>
        <span className={`${styles.pastille} ${styles.pastilleOk}`} aria-hidden="true">✓</span>
        <div className={styles.resume}>
          <h2 id={id} className={styles.petitTitre}>{title}</h2>
          {summary && <p className={styles.texte}>{summary}</p>}
        </div>
        {onEdit && <button type="button" className={styles.modifier} onClick={onEdit} aria-label={`${editLabel} : ${title}`}>{editLabel}</button>}
      </section>
    );
  }

  if (status === 'upcoming') {
    return (
      <section className={`${styles.card} ${styles.ligne} ${styles.upcoming}`} aria-labelledby={id}>
        <span className={styles.pastille} aria-hidden="true">{number}</span>
        <h2 id={id} className={styles.titreAVenir}>{title}</h2>
      </section>
    );
  }

  return (
    <section className={`${styles.card} ${styles.active}`} aria-labelledby={id} aria-current="step">
      <h2 id={id} ref={titre} tabIndex={-1} className={styles.titre}>{title}</h2>
      <div className={styles.contenu}>{children}</div>
    </section>
  );
}
