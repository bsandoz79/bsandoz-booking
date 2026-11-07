import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar } from './Calendar';
import { addMonths, leadingBlanks, monthDays } from './calendarUtils';

describe('calendarUtils', () => {
  it('liste les jours du mois', () => {
    expect(monthDays('2026-11')).toHaveLength(30);
    expect(monthDays('2028-02')).toHaveLength(29);
  });
  it('calcule les cases vides avant le 1er (lundi en premier)', () => {
    expect(leadingBlanks('2026-11')).toBe(6); // 1er novembre 2026 = dimanche
    expect(leadingBlanks('2026-12')).toBe(1); // 1er décembre 2026 = mardi
  });
  it('change de mois et d’année', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('Calendar', () => {
  it('ne rend cliquables que les jours disponibles', async () => {
    const onSelect = vi.fn();
    render(<Calendar month="2026-11" availableDays={['2026-11-17']} onSelect={onSelect} onMonthChange={() => {}} />);
    expect(screen.getByRole('button', { name: /lundi 16 novembre 2026/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /mardi 17 novembre 2026/i }));
    expect(onSelect).toHaveBeenCalledWith('2026-11-17');
  });

  it('marque le jour sélectionné', () => {
    render(<Calendar month="2026-11" availableDays={['2026-11-17']} selected="2026-11-17" onSelect={() => {}} onMonthChange={() => {}} />);
    expect(screen.getByRole('button', { name: /mardi 17 novembre 2026/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('bloque la navigation hors des bornes', async () => {
    const onMonthChange = vi.fn();
    render(<Calendar month="2026-11" availableDays={[]} minMonth="2026-11" onSelect={() => {}} onMonthChange={onMonthChange} />);
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(onMonthChange).toHaveBeenCalledWith('2026-12');
  });
});
