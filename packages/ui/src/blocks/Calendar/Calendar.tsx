import { addMonths, formatDay, formatMonth, leadingBlanks, monthDays } from './calendarUtils';
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

/** Calendrier mensuel : jours disponibles en évidence, les autres désactivés. */
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
  const available = new Set(availableDays);
  const canPrev = !minMonth || month > minMonth;
  const canNext = !maxMonth || month < maxMonth;

  return (
    <div className={styles.calendar} aria-busy={loading}>
      <div className={styles.header}>
        <button type="button" className={styles.nav} onClick={() => onMonthChange(addMonths(month, -1))} disabled={!canPrev} aria-label="Mois précédent">‹</button>
        <span className={styles.title} aria-live="polite">{formatMonth(month, locale)}</span>
        <button type="button" className={styles.nav} onClick={() => onMonthChange(addMonths(month, 1))} disabled={!canNext} aria-label="Mois suivant">›</button>
      </div>
      <div className={styles.grid} role="grid" aria-label={formatMonth(month, locale)}>
        {weekdayLabels.map((label, i) => (
          <span key={`wd-${i}`} className={styles.weekday} aria-hidden="true">{label}</span>
        ))}
        {Array.from({ length: leadingBlanks(month) }, (_, i) => <span key={`blank-${i}`} />)}
        {monthDays(month).map((date) => {
          const isAvailable = available.has(date) && !loading;
          const isSelected = date === selected;
          const className = [styles.day, isAvailable ? styles.available : '', isSelected ? styles.selected : ''].join(' ').trim();
          return (
            <button
              key={date}
              type="button"
              className={className}
              disabled={!isAvailable}
              aria-pressed={isSelected}
              aria-label={formatDay(date, locale)}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
