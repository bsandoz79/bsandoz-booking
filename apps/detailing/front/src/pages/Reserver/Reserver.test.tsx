import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { Reserver } from './Reserver';

const continuer = () => screen.getByRole('button', { name: 'Continuer' });

/** Base Adresse Nationale simulée (mode démo : appel direct depuis le navigateur). */
function simulerBan() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    features: [{ properties: { label: '1 Place Max Lejeune 80100 Abbeville' }, geometry: { coordinates: [1.8357, 50.1054] } }],
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
    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage intérieur' }));
    await userEvent.click(continuer());

    await userEvent.type(screen.getByLabelText('Marque'), 'Peugeot');
    await userEvent.type(screen.getByLabelText('Modèle'), '3008');
    expect(screen.getByRole('radio', { name: 'SUV / 4x4' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(continuer());

    await userEvent.click(await screen.findByRole('button', { name: /Intérieur Signature/ }));
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText(/69,00/).length).toBeGreaterThan(0);
  });

  it('va jusqu’au paiement de l’acompte (démo) : extérieur, adresse, créneau, coordonnées, CGV', async () => {
    render(<MemoryRouter initialEntries={['/reserver']}><AppRoutes /></MemoryRouter>);

    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage extérieur' }));
    await userEvent.click(continuer());
    await userEvent.type(screen.getByLabelText('Marque'), 'Renault');
    await userEvent.type(screen.getByLabelText('Modèle'), 'Clio');
    await userEvent.click(screen.getByRole('radio', { name: 'Citadine' }));
    await userEvent.click(continuer());
    await userEvent.click(await screen.findByRole('button', { name: /Extérieur Éclat/ }));
    await userEvent.click(continuer());
    await userEvent.click(continuer()); // aucune option

    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'intervention/ }), '1 place max');
    await userEvent.click(await screen.findByRole('option', { name: /Abbeville/ }));
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

    const payer = screen.getByRole('button', { name: /Payer l'acompte \(7,50/ });
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
