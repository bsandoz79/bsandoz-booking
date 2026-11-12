import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { seDeconnecter } from '../../services/compte';

/** « Mon site » en mode démo : le pro modifie le contenu, le site affiche la nouvelle version tout de suite. */
async function ouvrirMonSite() {
  render(<MemoryRouter initialEntries={['/pro']}><AppRoutes /></MemoryRouter>);
  await userEvent.type(await screen.findByLabelText(/E-mail/), 'pro@example.org');
  await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'motdepasse1');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Mon site' }));
}

describe('Mon site (espace pro)', () => {
  afterEach(async () => { await seDeconnecter(); });

  it('modifie le téléphone et ajoute un avis, visibles aussitôt sur le site', async () => {
    await ouvrirMonSite();

    const telephone = screen.getByLabelText('Téléphone');
    await userEvent.clear(telephone);
    await userEvent.type(telephone, '03 22 11 22 33');

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter l’avis' }));
    await userEvent.type(screen.getByLabelText(/Avis 1 : prénom/), 'Camille M.');
    await userEvent.selectOptions(screen.getByLabelText('Avis 1 : note'), '4');
    await userEvent.type(screen.getByLabelText('Avis 1 : texte'), 'Travail soigné');

    await userEvent.click(screen.getAllByRole('button', { name: 'Enregistrer les modifications' })[0]);
    expect(await screen.findByRole('status')).toHaveTextContent('Site mis à jour');

    const pied = screen.getByRole('contentinfo');
    expect(within(pied).getByRole('link', { name: '03 22 11 22 33' })).toHaveAttribute('href', 'tel:0322112233');

    await userEvent.click(screen.getByRole('link', { name: 'Perfect Clean' }));
    const avis = await screen.findByRole('region', { name: 'Avis clients' });
    expect(within(avis).getByText('« Travail soigné »')).toBeInTheDocument();
    expect(within(avis).getByLabelText('Note : 4 sur 5')).toBeInTheDocument();
  });

  it('réordonne et retire les questions fréquentes', async () => {
    await ouvrirMonSite();
    expect(screen.getByLabelText('Question 1')).toHaveValue('Ai-je besoin de fournir l’eau ou l’électricité ?');
    await userEvent.click(within(screen.getByRole('group', { name: 'Questions fréquentes' })).getAllByRole('button', { name: 'Descendre' })[0]);
    expect(screen.getByLabelText('Question 2')).toHaveValue('Ai-je besoin de fournir l’eau ou l’électricité ?');
    await userEvent.click(screen.getByRole('button', { name: 'Retirer la question 2' }));
    expect(screen.queryByDisplayValue('Ai-je besoin de fournir l’eau ou l’électricité ?')).not.toBeInTheDocument();
  });
});
