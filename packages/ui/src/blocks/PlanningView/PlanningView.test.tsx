import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningView, disposer, eventsOfDay, startOfWeek, type PlanningEvent, type PlanningLabels, type PlanningViewProps } from './PlanningView';

const labels: PlanningLabels = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  previous: 'Précédent',
  next: 'Suivant',
  today: "Aujourd'hui",
  empty: 'Rien de prévu',
  more: (n) => `+${n}`,
  dayWithCount: (day, n) => `${day}, ${n} élément(s)`,
};

const events: PlanningEvent[] = [
  { id: '1', start: '2026-11-12T14:00', end: '2026-11-12T17:00', title: 'Rendez-vous B', subtitle: 'Amiens' },
  { id: '2', start: '2026-11-12T08:30', end: '2026-11-12T12:00', title: 'Rendez-vous A' },
  { id: '3', start: '2026-11-12T18:00', end: '2026-11-12T19:00', title: 'Indisponible', tone: 'blocked' },
  { id: '4', start: '2026-11-14T22:00', end: '2026-11-15T02:00', title: 'Nuit' },
];

function afficher(props: Partial<PlanningViewProps> = {}) {
  const onModeChange = vi.fn();
  const onDateChange = vi.fn();
  render(
    <PlanningView
      mode="day"
      date="2026-11-12"
      today="2026-11-12"
      events={events}
      labels={labels}
      onModeChange={onModeChange}
      onDateChange={onDateChange}
      {...props}
    />,
  );
  return { onModeChange, onDateChange };
}

describe('utilitaires du planning', () => {
  it('trouve le lundi de la semaine', () => {
    expect(startOfWeek('2026-11-12')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09');
  });

  it('trie les événements du jour et gère ceux à cheval sur minuit', () => {
    expect(eventsOfDay(events, '2026-11-12').map((e) => e.id)).toEqual(['2', '1', '3']);
    expect(eventsOfDay(events, '2026-11-14').map((e) => e.id)).toEqual(['4']);
    expect(eventsOfDay(events, '2026-11-15').map((e) => e.id)).toEqual(['4']);
    expect(eventsOfDay(events, '2026-11-13')).toEqual([]);
  });
});

describe('emploi du temps', () => {
  it('met côte à côte les rendez-vous qui se chevauchent', () => {
    const chevauchants: PlanningEvent[] = [
      { id: 'a', start: '2026-11-12T09:00', end: '2026-11-12T11:00', title: 'A' },
      { id: 'b', start: '2026-11-12T10:00', end: '2026-11-12T12:00', title: 'B' },
      { id: 'c', start: '2026-11-12T13:00', end: '2026-11-12T14:00', title: 'C' },
    ];
    expect(disposer(chevauchants, '2026-11-12').map((p) => [p.event.id, p.col, p.cols, p.debut, p.fin])).toEqual([
      ['a', 0, 2, 540, 660], ['b', 1, 2, 600, 720], ['c', 0, 1, 780, 840],
    ]);
  });

  it('affiche toute la journée, même sans rendez-vous, avec la hauteur de chaque case selon sa durée', () => {
    afficher({ hourStart: 8, hourEnd: 19 });
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    // 08h30 – 12h00 : 3 h 30 à 64 px l'heure.
    expect(screen.getByText('Rendez-vous A').parentElement).toHaveStyle({ height: '224px', top: '32px' });
  });
});

describe('PlanningView', () => {
  it('affiche la vue jour triée et ouvre un événement', async () => {
    const onEventClick = vi.fn();
    afficher({ onEventClick });
    const boutons = screen.getAllByRole('button', { name: /Rendez-vous|Indisponible/ });
    expect(boutons.map((b) => b.textContent)).toEqual([
      '08h30 – 12h00Rendez-vous A',
      '14h00 – 17h00Rendez-vous BAmiens',
      '18h00 – 19h00Indisponible',
    ]);
    await userEvent.click(boutons[1]);
    expect(onEventClick).toHaveBeenCalledWith(events[0]);
    expect(screen.getByRole('button', { name: 'Jour' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('affiche le message vide et navigue', async () => {
    const { onDateChange, onModeChange } = afficher({ date: '2026-11-13' });
    expect(screen.getByText('Rien de prévu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-11-14');
    await userEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-11-12');
    await userEvent.click(screen.getByRole('button', { name: 'Mois' }));
    expect(onModeChange).toHaveBeenCalledWith('month');
  });

  it('affiche la semaine du lundi au dimanche et recule d’une semaine', async () => {
    const { onDateChange, onModeChange } = afficher({ mode: 'week' });
    const jours = screen.getAllByRole('heading', { level: 3 });
    expect(jours).toHaveLength(7);
    expect(jours[0]).toHaveTextContent('Lun 9');
    expect(jours[6]).toHaveTextContent('Dim 15');
    expect(screen.getAllByText('Rien de prévu')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-11-05');
    await userEvent.click(within(jours[3]).getByRole('button'));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-11-12');
    expect(onModeChange).toHaveBeenLastCalledWith('day');
  });

  it('affiche le mois avec le nombre d’événements et les événements masqués', async () => {
    const { onDateChange } = afficher({ mode: 'month', maxPerMonthCell: 2 });
    expect(screen.getByRole('heading', { name: 'Novembre 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jeudi 12 novembre 2026, 3 élément/ })).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(onDateChange).toHaveBeenLastCalledWith('2026-12-01');
  });
});
