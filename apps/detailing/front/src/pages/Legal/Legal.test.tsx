import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';

const ouvrir = (chemin: string) => render(<MemoryRouter initialEntries={[chemin]}><AppRoutes /></MemoryRouter>);

describe('Pages légales', () => {
  it.each([
    ['/mentions-legales', 'Mentions légales'],
    ['/cgv', 'Conditions générales de vente'],
    ['/confidentialite', 'Politique de confidentialité'],
  ])('%s affiche « %s »', (chemin, titre) => {
    ouvrir(chemin);
    expect(screen.getByRole('heading', { level: 1, name: titre })).toBeInTheDocument();
  });

  it('laisse l’identité de l’entreprise à compléter', () => {
    ouvrir('/mentions-legales');
    expect(screen.getByText(/SIRET/)).toHaveTextContent('[à compléter]');
  });

  it('reprend l’acompte et le délai d’annulation dans les CGV', () => {
    ouvrir('/cgv');
    expect(screen.getByText(/acompte de 30 %/)).toBeInTheDocument();
    expect(screen.getByText(/Jusqu'à 48 heures avant/)).toBeInTheDocument();
  });

  it('affiche une page introuvable pour une adresse inconnue', () => {
    ouvrir('/nimporte-quoi');
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l\'accueil' })).toHaveAttribute('href', '/');
  });
});
