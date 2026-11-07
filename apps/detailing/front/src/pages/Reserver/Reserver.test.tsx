import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Reserver } from './Reserver';

describe('Parcours de réservation', () => {
  it('propose le type de véhicule depuis le modèle puis affiche le prix', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    const continuer = () => screen.getByRole('button', { name: 'Continuer' });

    expect(continuer()).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'Mon véhicule' }));
    await userEvent.click(continuer());

    await userEvent.type(screen.getByLabelText('Marque'), 'Peugeot');
    await userEvent.type(screen.getByLabelText('Modèle'), '3008');
    expect(screen.getByRole('radio', { name: 'SUV / 4x4' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(continuer());

    await userEvent.click(await screen.findByRole('button', { name: /complet/i }));
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText(/149,00/).length).toBeGreaterThan(0);
  });
});
