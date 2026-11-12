import { useRef, useState, type KeyboardEvent } from 'react';
import { addDays, addMonths, formatDay, formatMonth, leadingBlanks, monthDays } from './calendarUtils';
import styles from './Calendar.module.css';

export interface CalendarProps {
  /** Mois affiché, format YYYY-MM. */
  month: string;
  /** Jours réservables du mois, format YYYY-MM-DD. */
  availableDays: string[];
  /** Jour sélectionné, format YYYY-MM-DD. */
  selected?: string;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
  /** Premier et dernier mois navigables (YYYY-MM). */
  minMonth?: string;
  maxMonth?: string;
  loading?: boolean;
  locale?: string;
  weekdayLabels?: string[];
}

const DEFAULT_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Calendrier mensuel : jours disponibles en évidence, les autres désactivés.
 * Clavier : un seul jour atteignable par Tab ; flèches gauche / droite = jour disponible précédent / suivant,
 * haut / bas = une semaine avant / après (jour disponible le plus proche), Début / Fin = premier / dernier jour disponible.
 */
export function Calendar({
  month,
  availableDays,
  selected,
  onSelect,
  onMonthChange,
  minMonth,
  maxMonth,
  loading = false,
  locale = 'fr-FR',
  weekdayLabels = DEFAULT_WEEKDAYS,
}: CalendarProps) {
  const jours = loading ? [] : monthDays(month).filter((d) => availableDays.includes(d));
  const canPrev = !minMonth || month > minMonth;
  const canNext = !maxMonth || month < maxMonth;
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const actif = focused && jours.includes(focused) ? focused : selected && jours.includes(selected) ? selected : jours[0];

  const aller = (date: string | undefined) => {
    if (!date) return;
    setFocused(date);
    refs.current.get(date)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const index = jours.indexOf(date);
    let cible: string | undefined;
    switch (event.key) {
      case 'ArrowRight': cible = jours[index + 1]; break;
      case 'ArrowLeft': cible = jours[index - 1]; break;
      case 'ArrowDown': { const limite = addDays(date, 7); cible = jours.find((d) => d >= limite) ?? jours[jours.length - 1]; break; }
      case 'ArrowUp': { const limite = addDays(date, -7); cible = [...jours].reverse().find((d) => d <= limite) ?? jours[0]; break; }
      case 'Home': cible = jours[0]; break;
      case 'End': cible = jours[jours.length - 1]; break;
      default: return;
    }
    event.preventDefault();
    aller(cible);
  };

  return (
    <div className={styles.calendar} aria-busy={loading}>
      <div className={styles.header}>
        <button type="button" className={styles.nav} onClick={() => onMonthChange(addMonths(month, -1))} disabled={!canPrev} aria-label="Mois précédent">‹</button>
        <span className={styles.title} aria-live="polite">{formatMonth(month, locale)}</span>
        <button type="button" className={styles.nav} onClick={() => onMonthChange(addMonths(month, 1))} disabled={!canNext} aria-label="Mois suivant">›</button>
      </div>
      <div className={styles.grid} role="group" aria-label={formatMonth(month, locale)}>
        {weekdayLabels.map((label, i) => (
          <span key={`wd-${i}`} className={styles.weekday} aria-hidden="true">{label}</span>
        ))}
        {Array.from({ length: leadingBlanks(month) }, (_, i) => <span key={`blank-${i}`} />)}
        {monthDays(month).map((date) => {
          const isAvailable = jours.includes(date);
          const isSelected = date === selected;
          const className = [styles.day, isAvailable ? styles.available : '', isSelected ? styles.selected : ''].join(' ').trim();
          return (
            <button
              key={date}
              ref={(el) => { if (el) refs.current.set(date, el); else refs.current.delete(date); }}
              type="button"
              className={className}
              disabled={!isAvailable}
              tabIndex={date === actif ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={formatDay(date, locale)}
              onClick={() => onSelect(date)}
              onKeyDown={(event) => onKeyDown(event, date)}
              onFocus={() => setFocused(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
