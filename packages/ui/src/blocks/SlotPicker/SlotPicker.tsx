import styles from './SlotPicker.module.css';

export interface Slot {
  /** Début ISO 8601. */
  start: string;
  /** Libellé affiché, ex. « 10:30 ». */
  label: string;
  available?: boolean;
  /** Créneau mis en avant (ex. à côté d'un rendez-vous déjà prévu). */
  highlighted?: boolean;
}

export interface SlotPickerProps {
  slots: Slot[];
  selected?: string;
  onSelect: (start: string) => void;
  emptyMessage?: string;
  title?: string;
  /** Libellé des créneaux mis en avant (pastille et légende), ex. « Conseillé ». Sans libellé : pas de mise en avant. */
  highlightLabel?: string;
  /** Phrase d'explication sous la grille, affichée s'il y a des créneaux mis en avant. */
  highlightHint?: string;
}

/** Liste de créneaux d'un jour. */
export function SlotPicker({ slots, selected, onSelect, emptyMessage = 'Aucun créneau ce jour-là.', title, highlightLabel, highlightHint }: SlotPickerProps) {
  if (slots.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }
  return (
    <div className={styles.wrapper}>
      {title && <span className={styles.title}>{title}</span>}
      <div className={styles.grid} role="group" aria-label={title ?? 'Créneaux'}>
        {slots.map((slot) => {
          const isSelected = slot.start === selected;
          const disabled = slot.available === false;
          const highlighted = !!highlightLabel && !!slot.highlighted && !disabled;
          return (
            <button
              key={slot.start}
              type="button"
              className={[styles.slot, isSelected ? styles.selected : '', highlighted ? styles.highlighted : ''].join(' ').trim()}
              aria-pressed={isSelected}
              aria-label={highlighted ? `${slot.label}, ${highlightLabel}` : undefined}
              disabled={disabled}
              onClick={() => onSelect(slot.start)}
            >
              {slot.label}
              {highlighted && <span className={styles.badge} aria-hidden="true">{highlightLabel}</span>}
            </button>
          );
        })}
      </div>
      {highlightLabel && highlightHint && slots.some((s) => s.highlighted && s.available !== false) && <p className={styles.hint}>{highlightHint}</p>}
    </div>
  );
}
