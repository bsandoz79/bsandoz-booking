import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { seDeconnecter } from '../../services/compte';

/** Espace client en mode démo : un rendez-vous fictif le mardi 17 novembre 2026 (aujourd'hui : jeudi 12). */
const ouvrir = (chemin: string) => render(<MemoryRouter initialEntries={[chemin]}><AppRoutes /></MemoryRouter>);

async function seConnecterDemo() {
  ouvrir('/mon-espace');
  await userEvent.type(await screen.findByLabelText(/E-mail/), 'camille@example.org');
  await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'motdepasse1');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  await screen.findByRole('heading', { name: 'Bonjour Camille' });
}

describe('Espace client', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T09:00:00Z'));
  });
  afterEach(async () => {
    await seDeconnecter();
    vi.useRealTimers();
  });

  it('demande de se connecter, avec le lien « mot de passe oublié »', async () => {
    ouvrir('/mon-espace');
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute('href', '/compte/mot-de-passe');
  });

  it('affiche le rendez-vous à venir avec la limite d’annulation gratuite, puis l’annule', async () => {
    await seConnecterDemo();
    const carte = screen.getByRole('article', { name: 'Complet' });
    expect(within(carte).getByText(/mardi 17 novembre 2026/)).toBeInTheDocument();
    expect(within(carte).getByText(/Annulation gratuite jusqu’au dimanche 15 novembre 2026/)).toBeInTheDocument();

    await userEvent.click(within(carte).getByRole('button', { name: 'Annuler le rendez-vous' }));
    await userEvent.click(within(carte).getByRole('button', { name: 'Oui, annuler' }));
    expect(await screen.findByText('Aucun rendez-vous à venir.', { exact: false })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Historique' })).getByText('Annulé')).toBeInTheDocument();
  });

  it('déplace le rendez-vous sur un nouveau créneau (demi-journée pour une formule à durée incertaine)', async () => {
    await seConnecterDemo();
    const carte = screen.getByRole('article', { name: 'Complet' });
    await userEvent.click(within(carte).getByRole('button', { name: 'Déplacer' }));
    await userEvent.click(await within(carte).findByRole('button', { name: /vendredi 20 novembre 2026/ }));
    expect(await within(carte).findAllByRole('button', { name: /^(08:30|13:30)$/ })).toHaveLength(2);
    await userEvent.click(within(carte).getByRole('button', { name: '13:30' }));
    await userEvent.click(within(carte).getByRole('button', { name: 'Confirmer le nouveau créneau' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Rendez-vous déplacé au vendredi 20 novembre 2026');
  });

  it('se déconnecte et confirme avant de supprimer le compte', async () => {
    await seConnecterDemo();
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    expect(screen.getByRole('button', { name: 'Non, garder mon compte' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Oui, supprimer mon compte' }));
    expect(await screen.findByText(/compte a été supprimé/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
  });
});

describe('Liens reçus par e-mail', () => {
  it('crée le mot de passe à l’activation puis invite à se connecter', async () => {
    ouvrir('/compte/activer?jeton=a1');
    const mdp = screen.getByLabelText(/^Mot de passe/);
    await userEvent.type(mdp, 'court');
    expect(screen.getByText(/10 caractères minimum/, { selector: '[role="alert"]' })).toBeInTheDocument();
    await userEvent.clear(mdp);
    await userEvent.type(mdp, 'motdepasse1');
    await userEvent.type(screen.getByLabelText(/Confirmez/), 'motdepasse2');
    expect(screen.getByText('Les deux mots de passe ne sont pas identiques.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le mot de passe' })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/Confirmez/));
    await userEvent.type(screen.getByLabelText(/Confirmez/), 'motdepasse1');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));
    expect(await screen.findByText('Mot de passe enregistré : vous pouvez vous connecter.')).toBeInTheDocument();
  });

  it('envoie le lien « mot de passe oublié » sans dire si le compte existe', async () => {
    ouvrir('/compte/mot-de-passe');
    await userEvent.type(screen.getByLabelText(/E-mail/), 'inconnu@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir le lien' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Si un compte existe pour cette adresse');
  });

  it('gère un rendez-vous sans compte depuis le lien, et signale un lien incomplet', async () => {
    const { unmount } = ouvrir('/rendez-vous?jeton=abc');
    expect(await screen.findByRole('article', { name: 'Complet' })).toBeInTheDocument();
    unmount();
    ouvrir('/rendez-vous');
    expect(screen.getByRole('alert')).toHaveTextContent('Ce lien est incomplet');
  });
});
