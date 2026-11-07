import type { ReactNode } from 'react';
import styles from './OptionCard.module.css';

export interface OptionCardProps {
  title: string;
  description?: string;
  /** Prix déjà formaté, ex. « + 15 € ». */
  priceLabel?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Badge facultatif, ex. « Le plus choisi », « Bientôt disponible ». */
  badge?: ReactNode;
}

/** Carte sélectionnable (formule, option, besoin). */
export function OptionCard({ title, description, priceLabel, selected, onToggle, disabled = false, badge }: OptionCardProps) {
  return (
    <button
      type="button"
      className={[styles.card, selected ? styles.selected : ''].join(' ').trim()}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className={styles.top}>
        <span className={styles.title}>{title}</span>
        <span className={styles.mark} aria-hidden="true">{selected ? '✓' : '+'}</span>
      </span>
      {badge && <span className={styles.badge}>{badge}</span>}
      {description && <span className={styles.description}>{description}</span>}
      {priceLabel && <span className={styles.price}>{priceLabel}</span>}
    </button>
  );
}
