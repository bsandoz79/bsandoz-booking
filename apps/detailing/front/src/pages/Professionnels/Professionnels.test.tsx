import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';

describe('Page Professionnels', () => {
  it('présente l’offre sur devis et envoie une demande de devis', async () => {
    render(<MemoryRouter initialEntries={['/professionnels']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Espace professionnels' })).toBeInTheDocument();
    expect(screen.getByText(/Uniquement sur devis/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pro' })).toHaveAttribute('href', '/professionnels');

    const envoyer = screen.getByRole('button', { name: 'Envoyer ma demande' });
    expect(envoyer).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Nom et prénom/), 'Alex Martin');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'alex@transport.test');
    await userEvent.selectOptions(screen.getByLabelText('Type de véhicules'), 'Utilitaires');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Extérieur' }));
    await userEvent.type(screen.getByLabelText(/^Votre besoin/), '6 utilitaires une fois par mois.');
    await userEvent.click(envoyer);

    expect(await screen.findByRole('status')).toHaveTextContent('Merci, votre demande est envoyée.');
  });
});
