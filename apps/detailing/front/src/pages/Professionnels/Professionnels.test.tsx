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
    await userEvent.type(screen.getByLabelText(/^Nom de l’entreprise/), 'Transports Martin');
    await userEvent.type(screen.getByLabelText(/^SIRET/), '123');
    expect(screen.getByText('SIRET : 14 chiffres ; BCE : 10 chiffres.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^SIRET/), '45678901234');
    await userEvent.selectOptions(screen.getByLabelText('Type de véhicules'), 'Utilitaires');
    await userEvent.selectOptions(screen.getByLabelText('Type de véhicules'), 'Autre');
    await userEvent.type(screen.getByLabelText('Précisez le type de véhicules'), 'Camping-cars');
    await userEvent.selectOptions(screen.getByLabelText('Nombre de véhicules'), '3');
    await userEvent.click(screen.getByRole('button', { name: /Extérieur/ }));
    expect(screen.getByRole('button', { name: /Extérieur/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(screen.getByLabelText(/^Votre besoin/), '6 utilitaires une fois par mois.');
    await userEvent.click(envoyer);

    expect(await screen.findByRole('status')).toHaveTextContent('Merci, votre demande est envoyée.');
  });
});

describe('Page Devis', () => {
  it('reprend l’adresse hors zone et envoie la demande d’un particulier', async () => {
    render(<MemoryRouter initialEntries={['/devis?adresse=10%20Rue%20de%20Rivoli%2075001%20Paris']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Demander un devis' })).toBeInTheDocument();
    expect(await screen.findByText(/au-delà de 50 km autour de Abbeville/)).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse d’intervention')).toHaveValue('10 Rue de Rivoli 75001 Paris');

    await userEvent.type(screen.getByLabelText(/^Nom et prénom/), 'Camille Martin');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'camille@example.org');
    await userEvent.click(screen.getByRole('button', { name: /Nettoyage intérieur/ }));
    await userEvent.type(screen.getByLabelText(/^Votre besoin/), 'Intérieur complet.');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Merci, votre demande est envoyée.');
  });
});
