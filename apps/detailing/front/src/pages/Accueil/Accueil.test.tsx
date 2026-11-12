import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Accueil } from './Accueil';

describe('Accueil', () => {
  it('présente les prestations, les étapes, les réalisations, la zone, les avis et la FAQ', () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    for (const titre of ['Prestations', 'Comment ça marche', 'Réalisations', 'Zone d’intervention', 'Avis clients', 'Questions fréquentes']) {
      expect(screen.getByRole('heading', { level: 2, name: titre })).toBeInTheDocument();
    }
    for (const categorie of ['Nettoyage intérieur', 'Nettoyage extérieur', 'Rénovation des phares', 'Soins à la carte']) {
      expect(screen.getByRole('heading', { level: 3, name: categorie })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 4, name: 'Intérieur Signature' })).toBeInTheDocument();
    expect(screen.getByText(/rayon de 5 km/)).toBeInTheDocument();
  });

  it('n’invente aucun avis ni photo', () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const avis = screen.getByRole('region', { name: 'Avis clients' });
    expect(avis).toHaveTextContent('[à compléter]');
    expect(screen.getByRole('region', { name: 'Réalisations' }).querySelectorAll('img')).toHaveLength(0);
  });
});
