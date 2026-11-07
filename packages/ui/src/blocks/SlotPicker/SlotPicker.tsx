import styles from './SlotPicker.module.css';

export interface Slot {
  /** Début ISO 8601. */
  start: string;
  /** Libellé affiché, ex. « 10:30 ». */
  label: string;
  available?: boolean;
}

export interface SlotPickerProps {
  slots: Slot[];
  selected?: string;
  onSelect: (start: string) => void;
  emptyMessage?: string;
  title?: string;
}

/** Liste de créneaux d'un jour. */
export function SlotPicker({ slots, selected, onSelect, emptyMessage = 'Aucun créneau ce jour-là.', title }: SlotPickerProps) {
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
          return (
            <button
              key={slot.start}
              type="button"
              className={[styles.slot, isSelected ? styles.selected : ''].join(' ').trim()}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onSelect(slot.start)}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
