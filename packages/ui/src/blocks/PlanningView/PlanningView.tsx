import { addDays, addMonths, formatDay, formatMonth, leadingBlanks, monthDays } from '../Calendar/calendarUtils';
import styles from './PlanningView.module.css';

export type PlanningMode = 'day' | 'week' | 'month';

export interface PlanningEvent {
  id: string;
  /** Début et fin en heure locale, format YYYY-MM-DDTHH:mm. */
  start: string;
  end: string;
  title: string;
  /** Ligne secondaire (ex. lieu, client). */
  subtitle?: string;
  /** `blocked` = indisponibilité, `muted` = élément secondaire (ex. en attente). */
  tone?: 'default' | 'muted' | 'blocked';
}

export interface PlanningLabels {
  day: string;
  week: string;
  month: string;
  previous: string;
  next: string;
  today: string;
  /** Message d'un jour sans événement. */
  empty: string;
  /** Texte « +n » du mois quand des événements sont masqués, reçoit n. */
  more: (count: number) => string;
  /** Nom accessible d'un jour du mois, reçoit le libellé du jour et le nombre d'événements. */
  dayWithCount: (day: string, count: number) => string;
}

export interface PlanningViewProps {
  mode: PlanningMode;
  /** Jour de référence, format YYYY-MM-DD. */
  date: string;
  /** Aujourd'hui, format YYYY-MM-DD (fourni par l'application, testable). */
  today: string;
  events: PlanningEvent[];
  labels: PlanningLabels;
  onModeChange: (mode: PlanningMode) => void;
  onDateChange: (date: string) => void;
  onEventClick?: (event: PlanningEvent) => void;
  locale?: string;
  weekdayLabels?: string[];
  /** Nombre d'événements visibles par case en vue mois. */
  maxPerMonthCell?: number;
}

const DEFAULT_WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Lundi de la semaine de `date`. */
export function startOfWeek(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

const heure = (dateTime: string) => dateTime.slice(11, 16).replace(':', 'h');

/** Événements d'un jour, triés par heure de début (un événement sur plusieurs jours apparaît chaque jour). */
export function eventsOfDay(events: PlanningEvent[], day: string): PlanningEvent[] {
  const debut = `${day}T00:00`;
  const fin = `${addDays(day, 1)}T00:00`;
  return events
    .filter((e) => e.start < fin && (e.end > debut || e.start >= debut))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Planning du pro : vues jour, semaine (liste par jour) et mois (grille), navigation précédent / suivant / aujourd'hui. */
export function PlanningView({
  mode,
  date,
  today,
  events,
  labels,
  onModeChange,
  onDateChange,
  onEventClick,
  locale = 'fr-FR',
  weekdayLabels = DEFAULT_WEEKDAYS,
  maxPerMonthCell = 2,
}: PlanningViewProps) {
  const month = date.slice(0, 7);
  const lundi = startOfWeek(date);
  const semaine = Array.from({ length: 7 }, (_, i) => addDays(lundi, i));

  const titre =
    mode === 'month'
      ? formatMonth(month, locale)
      : mode === 'week'
        ? `${formatDay(semaine[0], locale)} – ${formatDay(semaine[6], locale)}`
        : formatDay(date, locale);

  const deplacer = (sens: 1 | -1) => {
    if (mode === 'day') onDateChange(addDays(date, sens));
    else if (mode === 'week') onDateChange(addDays(date, 7 * sens));
    else onDateChange(`${addMonths(month, sens)}-01`);
  };

  const evenement = (e: PlanningEvent, compact = false) => {
    const contenu = (
      <>
        <span className={styles.time}>{heure(e.start)}{compact ? '' : ` – ${heure(e.end)}`}</span>
        <span className={styles.eventTitle}>{e.title}</span>
        {!compact && e.subtitle && <span className={styles.subtitle}>{e.subtitle}</span>}
      </>
    );
    const classe = [styles.event, styles[e.tone ?? 'default'], compact ? styles.compact : ''].join(' ').trim();
    return (
      <li key={e.id}>
        {onEventClick ? (
          <button type="button" className={classe} onClick={() => onEventClick(e)}>{contenu}</button>
        ) : (
          <div className={classe}>{contenu}</div>
        )}
      </li>
    );
  };

  const jour = (day: string) => {
    const liste = eventsOfDay(events, day);
    return liste.length === 0 ? (
      <p className={styles.empty}>{labels.empty}</p>
    ) : (
      <ul className={styles.list}>{liste.map((e) => evenement(e))}</ul>
    );
  };

  return (
    <section className={styles.planning} aria-label={titre}>
      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button type="button" className={styles.navButton} onClick={() => deplacer(-1)} aria-label={labels.previous}>‹</button>
          <button type="button" className={styles.todayButton} onClick={() => onDateChange(today)}>{labels.today}</button>
          <button type="button" className={styles.navButton} onClick={() => deplacer(1)} aria-label={labels.next}>›</button>
        </div>
        <h2 className={styles.title} aria-live="polite">{titre}</h2>
        <div className={styles.modes} role="group">
          {(['day', 'week', 'month'] as const).map((m) => (
            <button key={m} type="button" className={styles.mode} aria-pressed={mode === m} onClick={() => onModeChange(m)}>
              {labels[m]}
            </button>
          ))}
        </div>
      </div>

      {mode === 'day' && jour(date)}

      {mode === 'week' && (
        <div className={styles.week}>
          {semaine.map((day, i) => (
            <div key={day} className={[styles.weekDay, day === today ? styles.isToday : ''].join(' ').trim()}>
              <h3 className={styles.dayTitle}>
                <button type="button" className={styles.dayLink} onClick={() => { onDateChange(day); onModeChange('day'); }} aria-label={formatDay(day, locale)}>
                  <span aria-hidden="true">{weekdayLabels[i]} {Number(day.slice(8))}</span>
                </button>
              </h3>
              {jour(day)}
            </div>
          ))}
        </div>
      )}

      {mode === 'month' && (
        <div className={styles.month}>
          {weekdayLabels.map((label, i) => (
            <span key={`wd-${i}`} className={styles.weekday} aria-hidden="true">{label}</span>
          ))}
          {Array.from({ length: leadingBlanks(month) }, (_, i) => <span key={`blank-${i}`} />)}
          {monthDays(month).map((day) => {
            const liste = eventsOfDay(events, day);
            const visibles = liste.slice(0, maxPerMonthCell);
            const masques = liste.length - visibles.length;
            return (
              <div key={day} className={[styles.cell, day === today ? styles.isToday : '', liste.length > 0 ? styles.busy : ''].join(' ').trim()}>
                <button
                  type="button"
                  className={styles.dayLink}
                  onClick={() => { onDateChange(day); onModeChange('day'); }}
                  aria-label={labels.dayWithCount(formatDay(day, locale), liste.length)}
                >
                  <span aria-hidden="true">{Number(day.slice(8))}</span>
                </button>
                {visibles.length > 0 && <ul className={styles.list}>{visibles.map((e) => evenement(e, true))}</ul>}
                {masques > 0 && <span className={styles.more}>{labels.more(masques)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
