import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Accueil } from './Accueil';

describe('Accueil', () => {
  it('présente les prestations, les étapes, les réalisations, la zone, les avis et la FAQ', async () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    for (const titre of ['Prestations', 'Comment ça marche', 'Réalisations', 'Zone d’intervention', 'Avis clients', 'Questions fréquentes']) {
      expect(screen.getByRole('heading', { level: 2, name: titre })).toBeInTheDocument();
    }
    expect(await screen.findByRole('heading', { level: 2, name: 'Horaires' })).toBeInTheDocument();
  });

  it('affiche les prestations par catégorie, avec ce qui est compris et un lien de réservation', async () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const onglets = screen.getAllByRole('tab');
    expect(onglets.map((o) => o.textContent)).toEqual(['Nettoyage intérieur', 'Nettoyage extérieur', 'Rénovation des phares', 'Soins à la carte']);
    expect(onglets[0]).toHaveAttribute('aria-selected', 'true');

    const panneau = screen.getByRole('tabpanel');
    const signature = within(panneau).getByRole('heading', { level: 3, name: 'Intérieur Signature' }).closest('article')!;
    expect(signature).toHaveTextContent('Le plus choisi');
    expect(signature).toHaveTextContent('69,00 €');
    expect(within(signature).getByRole('list')).toHaveTextContent('Shampoing des sièges');
    expect(within(signature).getByRole('link', { name: 'Choisir Intérieur Signature' })).toHaveAttribute('href', '/reserver?formule=int-signature');
    expect(within(panneau).getByRole('heading', { level: 3, name: 'Options' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Nettoyage extérieur' }));
    expect(screen.getByRole('tab', { name: 'Nettoyage extérieur' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { level: 3, name: 'Extérieur Éclat' })).toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).queryByRole('heading', { name: 'Intérieur Signature' })).not.toBeInTheDocument();

    // Navigation au clavier entre les onglets.
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Rénovation des phares' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Rénovation des phares' })).toHaveAttribute('aria-selected', 'true');
  });

  it('affiche les frais de déplacement par tranches et les horaires de la semaine', async () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const tranches = await screen.findByRole('list', { name: 'Frais de déplacement par distance' });
    expect(within(tranches).getAllByRole('listitem').map((l) => l.textContent)).toEqual(
      ['0 à 5 kmOffert', '5 à 15 km5 €', '15 à 30 km10 €', '30 à 50 km20 €', 'Au-delà de 50 kmSur devis'],
    );

    const horaires = screen.getByRole('region', { name: 'Horaires' });
    expect(within(horaires).getAllByRole('listitem')).toHaveLength(7);
    expect(horaires).toHaveTextContent('Lundi8 h – 19 h');
    expect(horaires).toHaveTextContent('Dimanche');
    expect(horaires).toHaveTextContent('10 h – 18 h');
    expect(within(horaires).getByText(/aujourd’hui/).closest('li')).toHaveAttribute('aria-current', 'date');
  });

  it('présente la carte de fidélité avec un exemple tamponné', async () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const section = await screen.findByRole('region', { name: 'Carte de fidélité' });
    expect(section).toHaveTextContent('Au bout de 4 prestations, la suivante bénéficie de 20 % de remise');
    expect(within(section).getByRole('img', { name: '2 tampons sur 4' })).toBeInTheDocument();
    expect(section).toHaveTextContent('Exemple');
  });

  it('n’invente aucun avis ni photo', () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const avis = screen.getByRole('region', { name: 'Avis clients' });
    expect(avis).toHaveTextContent('[à compléter]');
    expect(screen.getByRole('region', { name: 'Réalisations' }).querySelectorAll('img')).toHaveLength(0);
  });
});
