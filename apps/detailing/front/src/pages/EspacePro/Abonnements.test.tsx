import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AbonnementsOnglet } from './Abonnements';

describe('Abonnements (espace pro, démo)', () => {
  it('liste les offres et en crée une nouvelle', async () => {
    render(<AbonnementsOnglet />);
    const offres = await screen.findByRole('list', { name: 'Offres d’abonnement' });
    expect(within(offres).getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Aucun abonné pour l’instant.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '+ Nouvel abonnement' }));
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Lavage du mois');
    await userEvent.selectOptions(screen.getByLabelText('Une prestation'), 'mois');
    await userEvent.type(screen.getByLabelText(/Prix prélevé/), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Abonnement « Lavage du mois » enregistré.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier Lavage du mois' })).toBeInTheDocument();
  });
});
