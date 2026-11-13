import type { CSSProperties } from 'react';
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
  /** Couleur de la case (ex. selon le type de prestation) ; sinon couleur principale du thème. */
  color?: string;
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
  /** Heures affichées dans les vues jour et semaine (élargies si un événement en sort). */
  hourStart?: number;
  hourEnd?: number;
  /** Heure actuelle « HH:mm » pour le trait de l'heure courante (fournie par l'application, testable). */
  now?: string;
  /** Heures écrites dans les cases des vues jour et semaine (false : la position dans la grille suffit). */
  showTime?: boolean;
}

const DEFAULT_WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
/** Hauteur d'une heure dans la grille (px). */
const HEURE_PX = 64;

/** Lundi de la semaine de `date`. */
export function startOfWeek(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

const heure = (dateTime: string) => dateTime.slice(11, 16).replace(':', 'h');
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Événements d'un jour, triés par heure de début (un événement sur plusieurs jours apparaît chaque jour). */
export function eventsOfDay(events: PlanningEvent[], day: string): PlanningEvent[] {
  const debut = `${day}T00:00`;
  const fin = `${addDays(day, 1)}T00:00`;
  return events
    .filter((e) => e.start < fin && (e.end > debut || e.start >= debut))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Place les événements d'un jour en colonnes quand ils se chevauchent (col = colonne, cols = colonnes du groupe). */
export function disposer(events: PlanningEvent[], day: string): { event: PlanningEvent; debut: number; fin: number; col: number; cols: number }[] {
  const places = eventsOfDay(events, day).map((event) => ({
    event,
    debut: event.start.slice(0, 10) < day ? 0 : minutes(event.start.slice(11, 16)),
    fin: event.end.slice(0, 10) > day ? 24 * 60 : Math.max(minutes(event.end.slice(11, 16)), 1),
    col: 0,
    cols: 1,
  }));
  let groupe: typeof places = [];
  let finGroupe = -1;
  const fermer = () => { const n = Math.max(1, ...groupe.map((p) => p.col + 1)); groupe.forEach((p) => { p.cols = n; }); };
  for (const p of places) {
    if (p.debut >= finGroupe) { fermer(); groupe = []; }
    const prises = new Set(groupe.filter((g) => g.fin > p.debut).map((g) => g.col));
    let col = 0;
    while (prises.has(col)) col++;
    p.col = col;
    groupe.push(p);
    finGroupe = Math.max(finGroupe, p.fin);
  }
  fermer();
  return places;
}

/**
 * Planning du pro : vues jour et semaine en emploi du temps (toute la journée affichée, chaque rendez-vous dans une
 * case dont la hauteur suit sa durée, côte à côte s'ils se chevauchent), vue mois en grille ; navigation précédent /
 * suivant / aujourd'hui.
 */
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
  maxPerMonthCell = 3,
  hourStart = 7,
  hourEnd = 20,
  now,
  showTime = true,
}: PlanningViewProps) {
  const month = date.slice(0, 7);
  const lundi = startOfWeek(date);
  const semaine = Array.from({ length: 7 }, (_, i) => addDays(lundi, i));
  const jours = mode === 'day' ? [date] : semaine;

  // Plage horaire : celle demandée, élargie aux événements affichés.
  const places = jours.map((j) => disposer(events, j));
  const toutes = places.flat();
  const debutH = Math.min(hourStart, ...toutes.map((p) => Math.floor(p.debut / 60)));
  const finH = Math.max(hourEnd, ...toutes.map((p) => Math.ceil(p.fin / 60)));
  const heures = Array.from({ length: finH - debutH }, (_, i) => debutH + i);
  const hauteur = (finH - debutH) * HEURE_PX;
  const px = (min: number) => ((min - debutH * 60) / 60) * HEURE_PX;

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

  const classeEvenement = (e: PlanningEvent, extra = '') => [styles.event, styles[e.tone ?? 'default'], extra].join(' ').trim();
  const couleur = (e: PlanningEvent): CSSProperties | undefined => (e.color && (e.tone ?? 'default') !== 'blocked' ? ({ '--couleur': e.color } as CSSProperties) : undefined);
  const bouton = (e: PlanningEvent, contenu: React.ReactNode, classe: string, style?: CSSProperties) => (
    onEventClick
      ? <button type="button" className={classe} style={style} onClick={() => onEventClick(e)}>{contenu}</button>
      : <div className={classe} style={style}>{contenu}</div>
  );

  const colonneJour = (day: string, i: number) => {
    const liste = places[i];
    return (
      <div key={day} className={[styles.colonne, day === today ? styles.isToday : ''].join(' ').trim()} style={{ height: hauteur }}>
        {liste.length === 0 && <p className={mode === 'day' ? styles.emptyDay : styles.srOnly}>{labels.empty}</p>}
        <ul className={styles.cases}>
          {liste.map(({ event: e, debut, fin, col, cols }) => {
            const top = Math.max(0, px(debut));
            const h = Math.max(22, px(fin) - top);
            const court = h < 44;
            const contenu = (
              <>
                {showTime && <span className={styles.time}>{heure(e.start)} – {heure(e.end)}</span>}
                <span className={styles.eventTitle}>{e.title}</span>
                {!court && e.subtitle && <span className={styles.subtitle}>{e.subtitle}</span>}
              </>
            );
            const style: CSSProperties = { top, height: h, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, ...couleur(e) };
            return <li key={e.id}>{bouton(e, contenu, classeEvenement(e, court ? styles.court : ''), style)}</li>;
          })}
        </ul>
        {day === today && now && minutes(now) >= debutH * 60 && minutes(now) <= finH * 60 && (
          <span className={styles.maintenant} style={{ top: px(minutes(now)) }} aria-hidden="true" />
        )}
      </div>
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

      {mode !== 'month' && (
        <div className={[styles.agenda, mode === 'week' ? styles.agendaSemaine : ''].join(' ').trim()}>
          <div className={styles.entete}>
            <span />
            {mode === 'week' ? semaine.map((day, i) => (
              <h3 key={day} className={[styles.dayTitle, day === today ? styles.isToday : ''].join(' ').trim()}>
                <button type="button" className={styles.dayLink} onClick={() => { onDateChange(day); onModeChange('day'); }} aria-label={formatDay(day, locale)}>
                  <span aria-hidden="true">{weekdayLabels[i]} {Number(day.slice(8))}</span>
                </button>
              </h3>
            )) : <span />}
          </div>
          <div className={styles.grille} style={{ height: hauteur }}>
            <div className={styles.heures} aria-hidden="true">
              {heures.map((h) => <span key={h} style={{ top: (h - debutH) * HEURE_PX }}>{String(h).padStart(2, '0')}:00</span>)}
            </div>
            <div className={styles.lignes} aria-hidden="true">
              {heures.map((h) => <span key={h} style={{ top: (h - debutH) * HEURE_PX }} />)}
            </div>
            {jours.map((day, i) => colonneJour(day, i))}
          </div>
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
                  className={styles.dayNumber}
                  onClick={() => { onDateChange(day); onModeChange('day'); }}
                  aria-label={labels.dayWithCount(formatDay(day, locale), liste.length)}
                >
                  <span aria-hidden="true">{Number(day.slice(8))}</span>
                </button>
                {visibles.length > 0 && (
                  <ul className={styles.puces}>
                    {visibles.map((e) => (
                      <li key={e.id}>{bouton(e, <><span className={styles.time}>{heure(e.start)}</span> <span className={styles.eventTitle}>{e.title}</span></>, classeEvenement(e, styles.puce), couleur(e))}</li>
                    ))}
                  </ul>
                )}
                {masques > 0 && <span className={styles.more}>{labels.more(masques)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
