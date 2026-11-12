import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar } from './Calendar';
import { addDays, addMonths, leadingBlanks, monthDays } from './calendarUtils';

describe('calendarUtils', () => {
  it('liste les jours du mois', () => {
    expect(monthDays('2026-11')).toHaveLength(30);
    expect(monthDays('2028-02')).toHaveLength(29);
  });
  it('calcule les cases vides avant le 1er (lundi en premier)', () => {
    expect(leadingBlanks('2026-11')).toBe(6); // 1er novembre 2026 = dimanche
    expect(leadingBlanks('2026-12')).toBe(1); // 1er décembre 2026 = mardi
  });
  it('ajoute des jours, y compris en changeant de mois', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05');
    expect(addDays('2026-11-03', -7)).toBe('2026-10-27');
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

describe('Calendar au clavier', () => {
  const jours = ['2026-11-03', '2026-11-05', '2026-11-10', '2026-11-17', '2026-11-26'];
  const jour = (nom: RegExp) => screen.getByRole('button', { name: nom });

  it('un seul jour atteignable par Tab : le jour choisi, sinon le premier disponible', () => {
    const { rerender } = render(<Calendar month="2026-11" availableDays={jours} onSelect={() => {}} onMonthChange={() => {}} />);
    expect(jour(/mardi 3 novembre 2026/i)).toHaveAttribute('tabindex', '0');
    expect(jour(/jeudi 5 novembre 2026/i)).toHaveAttribute('tabindex', '-1');

    rerender(<Calendar month="2026-11" availableDays={jours} selected="2026-11-10" onSelect={() => {}} onMonthChange={() => {}} />);
    expect(jour(/mardi 10 novembre 2026/i)).toHaveAttribute('tabindex', '0');
  });

  it('flèches, semaines, début et fin', async () => {
    const onSelect = vi.fn();
    render(<Calendar month="2026-11" availableDays={jours} onSelect={onSelect} onMonthChange={() => {}} />);
    const user = userEvent.setup();

    await user.tab();
    await user.tab();
    await user.tab(); // mois précédent, mois suivant, puis le premier jour disponible
    expect(jour(/mardi 3 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(jour(/jeudi 5 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(jour(/mardi 17 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(jour(/mardi 10 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{End}');
    expect(jour(/jeudi 26 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{Home}');
    expect(jour(/mardi 3 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(jour(/mardi 3 novembre 2026/i)).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('2026-11-03');
  });
});
