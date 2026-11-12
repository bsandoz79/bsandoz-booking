import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { Reserver } from './Reserver';

const continuer = () => screen.getByRole('button', { name: 'Continuer' });

/** Base Adresse Nationale simulée (mode démo : appel direct depuis le navigateur). */
function simulerBan() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    features: [{ properties: { label: '10 Rue de la République 80000 Amiens' }, geometry: { coordinates: [2.2958, 49.8941] } }],
  }))));
}

describe('Parcours de réservation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T09:00:00'));
    simulerBan();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('propose le type de véhicule depuis le modèle puis affiche le prix', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);

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

  it('va jusqu’au paiement de l’acompte (démo) : canapé, adresse, demi-journée, coordonnées, CGV', async () => {
    render(<MemoryRouter initialEntries={['/reserver']}><AppRoutes /></MemoryRouter>);

    await userEvent.click(screen.getByRole('radio', { name: 'Mon canapé' }));
    await userEvent.click(continuer());
    await userEvent.click(screen.getByRole('radio', { name: '3 places' }));
    await userEvent.click(continuer());
    await userEvent.click(await screen.findByRole('button', { name: /Nettoyage de canapé/ }));
    await userEvent.click(continuer());
    await userEvent.click(continuer()); // aucune option

    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'intervention/ }), '10 rue de la');
    await userEvent.click(await screen.findByRole('option', { name: /République/ }));
    expect(await screen.findByText(/déplacement offert/)).toBeInTheDocument();
    await userEvent.click(continuer());

    await userEvent.click(await screen.findByRole('button', { name: /vendredi 13 novembre 2026/ }));
    await userEvent.click(await screen.findByRole('button', { name: '10:30' }));
    await userEvent.click(continuer());

    await userEvent.type(screen.getByLabelText('Prénom'), 'Camille');
    await userEvent.type(screen.getByLabelText('Nom'), 'Martin');
    await userEvent.type(screen.getByLabelText('E-mail'), 'camille@example.org');
    await userEvent.type(screen.getByLabelText('Téléphone'), '0600000000');
    await userEvent.click(continuer());

    const payer = screen.getByRole('button', { name: /Payer l'acompte \(26,70/ });
    expect(payer).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(payer);

    expect(await screen.findByRole('heading', { name: 'Merci, votre rendez-vous est réservé.' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Mode démonstration');
  });

  it('prévient quand le paiement de l’acompte a été abandonné', () => {
    render(<MemoryRouter initialEntries={['/reserver?paiement=annule&reservation=r1']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('paiement de l\'acompte a été annulé');
  });
});
