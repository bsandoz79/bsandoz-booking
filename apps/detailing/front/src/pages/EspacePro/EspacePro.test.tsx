import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { seDeconnecter } from '../../services/compte';

/** Espace pro en mode démo (données en mémoire). */
async function ouvrirConnecte() {
  render(<MemoryRouter initialEntries={['/pro']}><AppRoutes /></MemoryRouter>);
  await userEvent.type(await screen.findByLabelText(/E-mail/), 'pro@example.org');
  await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'motdepasse1');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  await screen.findByRole('navigation', { name: 'Rubriques de l\'espace pro' });
}

const rubrique = (nom: string) => userEvent.click(within(screen.getByRole('navigation', { name: 'Rubriques de l\'espace pro' })).getByRole('button', { name: nom }));

describe('Espace pro', () => {
  afterEach(async () => { await seDeconnecter(); });

  it('demande la connexion puis affiche le tableau de bord', async () => {
    await ouvrirConnecte();
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByText('Acomptes en attente')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prochains rendez-vous' })).toBeInTheDocument();
  });

  it('ajoute un tampon de fidélité au client depuis le détail du rendez-vous', async () => {
    await ouvrirConnecte();
    await rubrique('Planning');
    await userEvent.click(screen.getByRole('button', { name: 'Jour' }));
    await userEvent.click(await screen.findByRole('button', { name: /Intérieur Éclat – Client démo A/ }));
    const detail = screen.getByRole('region', { name: /Rendez-vous du/ });
    expect(await within(detail).findByText('0 / 4')).toBeInTheDocument();
    await userEvent.click(within(detail).getByRole('button', { name: 'Ajouter un tampon' }));
    expect(await within(detail).findByText('1 / 4')).toBeInTheDocument();
  });

  it('affiche le planning et le détail d’un rendez-vous avec les coordonnées du client', async () => {
    await ouvrirConnecte();
    await rubrique('Planning');
    await userEvent.click(screen.getByRole('button', { name: 'Jour' }));
    await userEvent.click(await screen.findByRole('button', { name: /Intérieur Éclat – Client démo A/ }));
    const detail = screen.getByRole('region', { name: /Rendez-vous du/ });
    expect(within(detail).getByRole('link', { name: '01 02 03 04 05' })).toHaveAttribute('href', 'tel:0102030405');
    await userEvent.click(within(detail).getByRole('button', { name: 'Annuler le rendez-vous' }));
    await userEvent.click(within(detail).getByRole('button', { name: 'Annuler et rembourser l’acompte' }));
    expect(await within(detail).findByRole('status')).toHaveTextContent('Rendez-vous annulé, 8,70');
  });

  it('règle la carte de fidélité', async () => {
    await ouvrirConnecte();
    await rubrique('Réglages');
    const remise = await screen.findByLabelText('Remise (%)');
    await userEvent.clear(remise);
    await userEvent.type(remise, '15');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer la carte de fidélité' }));
    expect(await screen.findByText('Carte de fidélité enregistrée.')).toBeInTheDocument();
  });

  it('modifie le tarif d’une prestation du catalogue', async () => {
    await ouvrirConnecte();
    await rubrique('Catalogue');
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Extérieur Éclat' }));
    const prix = screen.getByLabelText(/^Prix \(€\)/);
    await userEvent.clear(prix);
    await userEvent.type(prix, '27,50');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Extérieur Éclat » enregistrée.');
  });

  it('refuse un montant mal saisi', async () => {
    await ouvrirConnecte();
    await rubrique('Catalogue');
    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une option' }));
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Cire');
    await userEvent.type(screen.getByLabelText(/^Prix/), '12,345');
    expect(screen.getByText('Montant invalide, ex. 15 ou 15,50.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('ajoute une plage horaire le dimanche et un congé', async () => {
    await ouvrirConnecte();
    await rubrique('Horaires et congés');
    const dimanche = await screen.findByRole('group', { name: 'Dimanche' });
    expect(within(dimanche).getByText('Fermé')).toBeInTheDocument();
    await userEvent.click(within(dimanche).getByRole('button', { name: 'Ajouter une plage le dimanche' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer les horaires' }));
    expect(await screen.findByText('Horaires enregistrés.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Premier jour'), '2026-12-24');
    await userEvent.type(screen.getByLabelText('Dernier jour'), '2026-12-26');
    await userEvent.type(screen.getByLabelText(/Motif/), 'Noël');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter le congé' }));
    expect(await screen.findByText(/Du jeudi 24 décembre 2026 au samedi 26 décembre 2026 · Noël/)).toBeInTheDocument();
  });

  it('passe en activité sur place', async () => {
    await ouvrirConnecte();
    await rubrique('Réglages');
    await userEvent.click(await screen.findByRole('switch', { name: 'Je me déplace chez le client' }));
    expect(screen.queryByLabelText(/Point de départ/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer la zone' }));
    expect(await screen.findByText('Zone d’intervention enregistrée.')).toBeInTheDocument();
  });

  it('n’enregistre un rendez-vous par téléphone que lorsque tout est renseigné', async () => {
    await ouvrirConnecte();
    await rubrique('Rendez-vous par téléphone');
    expect(await screen.findByRole('button', { name: 'Enregistrer le rendez-vous' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Envoyer un lien de paiement de l’acompte' })).toHaveAttribute('aria-checked', 'true');
  });
});
