import type { ReactNode } from 'react';
import styles from './PriceSummary.module.css';

export interface PriceLine {
  label: string;
  /** Montant en centimes. */
  amountCents: number;
}

export interface PriceSummaryProps {
  title?: string;
  lines: PriceLine[];
  totalCents: number;
  depositCents?: number;
  footnote?: ReactNode;
  action?: ReactNode;
}

export function formatEuros(cents: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Récapitulatif de prix : lignes, total, acompte. */
export function PriceSummary({ title = 'Récapitulatif', lines, totalCents, depositCents, footnote, action }: PriceSummaryProps) {
  return (
    <section className={styles.summary} aria-label={title} aria-live="polite">
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.lines}>
        {lines.map((line, i) => (
          <li key={`${line.label}-${i}`} className={styles.line}>
            <span>{line.label}</span>
            <span>{formatEuros(line.amountCents)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.total}><span>Total</span><strong>{formatEuros(totalCents)}</strong></p>
      {depositCents !== undefined && depositCents > 0 && (
        <p className={styles.deposit}><span>Acompte à la réservation</span><span>{formatEuros(depositCents)}</span></p>
      )}
      {footnote && <p className={styles.footnote}>{footnote}</p>}
      {action}
    </section>
  );
}
