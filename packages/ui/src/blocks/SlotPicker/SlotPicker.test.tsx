import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlotPicker } from './SlotPicker';

const slots = [
  { start: '2026-11-17T09:00:00+01:00', label: '09:00' },
  { start: '2026-11-17T14:00:00+01:00', label: '14:00' },
  { start: '2026-11-17T18:30:00+01:00', label: '18:30', available: false },
];

describe('SlotPicker', () => {
  it('sélectionne un créneau', async () => {
    const onSelect = vi.fn();
    render(<SlotPicker slots={slots} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: '14:00' }));
    expect(onSelect).toHaveBeenCalledWith('2026-11-17T14:00:00+01:00');
  });
  it('désactive les créneaux complets', () => {
    render(<SlotPicker slots={slots} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: '18:30' })).toBeDisabled();
  });
  it('met en avant les créneaux conseillés, avec une légende', () => {
    const conseilles = [{ ...slots[0], highlighted: true }, slots[1]];
    render(<SlotPicker slots={conseilles} onSelect={() => {}} highlightLabel="Conseillé" highlightHint="Conseillé : juste avant ou après un rendez-vous déjà prévu." />);
    expect(screen.getByRole('button', { name: '09:00, Conseillé' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '14:00' })).toBeInTheDocument();
    expect(screen.getByText('Conseillé : juste avant ou après un rendez-vous déjà prévu.')).toBeInTheDocument();
  });
  it('sans libellé, aucune mise en avant', () => {
    render(<SlotPicker slots={[{ ...slots[0], highlighted: true }]} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: '09:00' })).toBeInTheDocument();
  });
  it('affiche un message quand il n’y a rien', () => {
    render(<SlotPicker slots={[]} onSelect={() => {}} emptyMessage="Complet" />);
    expect(screen.getByText('Complet')).toBeInTheDocument();
  });
});
