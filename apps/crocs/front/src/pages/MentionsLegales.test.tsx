import { render, screen } from '@testing-library/react';
import { MentionsLegales } from './MentionsLegales';

describe('Mentions légales', () => {
  it('nomme l’éditeur, l’hébergeur, et dit ce qui est fait des données', () => {
    render(<MentionsLegales />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mentions légales');
    expect(screen.getByRole('region', { name: 'Éditeur du site' })).toHaveTextContent('220 rue de Rouen');
    expect(screen.getByRole('region', { name: 'Hébergeur' })).toHaveTextContent('o2switch');
    expect(screen.getByRole('region', { name: 'Données personnelles' })).toHaveTextContent('aucun bandeau de consentement');
    expect(screen.getByRole('region', { name: 'Éditeur du site' })).toHaveTextContent('SIRET 531 701 688 00024');
    // Ce qui n'est pas connu n'est pas inventé.
    expect(screen.getByRole('region', { name: 'Hébergeur' })).toHaveTextContent('[à compléter : adresse de l’hébergeur]');
    expect(screen.getByRole('link', { name: /Retour au site/ })).toHaveAttribute('href', '/');
  });
});
