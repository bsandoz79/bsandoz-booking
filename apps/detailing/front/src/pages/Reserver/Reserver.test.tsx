import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { Reserver } from './Reserver';

const bouton = (nom: string | RegExp) => screen.getByRole('button', { name: nom });

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

  it('affiche le prix dès le choix de la formule, sans demander le véhicule', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);

    expect(bouton('Choisir le créneau')).toBeDisabled();
    expect(screen.queryByLabelText('Marque')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage intérieur' }));
    await userEvent.click(await screen.findByRole('button', { name: /Intérieur Signature/ }));
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText(/69,00/).length).toBeGreaterThan(0);
    expect(bouton('Choisir le créneau')).toBeEnabled();
  });

  it('passe tout seul à « Où et quand ? » quand la formule n’a pas d’option à proposer', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Soins à la carte' }));
    await userEvent.click(await screen.findByRole('button', { name: /Ciel de toit/ }));
    expect(screen.getByRole('heading', { name: 'Où et quand ?' }).closest('section')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Modifier : Que faut-il nettoyer ?' })).toBeInTheDocument();
  });

  it('présélectionne la formule choisie sur l’accueil', async () => {
    render(<MemoryRouter initialEntries={['/reserver?formule=ext-signature']}><Reserver /></MemoryRouter>);
    expect(await screen.findByRole('radio', { name: 'Nettoyage extérieur' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('button', { name: /Extérieur Signature/, pressed: true })).toBeInTheDocument();
  });

  it('va jusqu’au paiement de l’acompte (démo) : extérieur, adresse, créneau, coordonnées, CGV', async () => {
    render(<MemoryRouter initialEntries={['/reserver']}><AppRoutes /></MemoryRouter>);

    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage extérieur' }));
    await userEvent.click(await screen.findByRole('button', { name: /Extérieur Éclat/ }));
    await userEvent.click(bouton('Choisir le créneau'));

    // Étape 1 repliée en résumé, étape 2 ouverte : adresse puis créneau.
    expect(screen.getByRole('button', { name: 'Modifier : Que faut-il nettoyer ?' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'intervention/ }), '1 place max');
    await userEvent.click(await screen.findByRole('option', { name: /Abbeville/ }));
    expect(await screen.findByText(/déplacement offert/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /vendredi 13 novembre 2026/ }));
    // Choisir l'heure ouvre directement l'étape des coordonnées.
    await userEvent.click(await screen.findByRole('button', { name: '10:30' }));
    expect(screen.getByRole('heading', { name: 'Vos coordonnées' }).closest('section')).toHaveAttribute('aria-current', 'step');

    expect(screen.getByText(/ven\. 13 nov\..*Abbeville/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Prénom'), 'Camille');
    await userEvent.type(screen.getByLabelText('Nom'), 'Martin');
    await userEvent.type(screen.getByLabelText('E-mail'), 'camille@example.org');
    await userEvent.type(screen.getByLabelText('Téléphone'), '0600000000');

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
