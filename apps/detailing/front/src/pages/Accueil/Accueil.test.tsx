import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { seConnecter, seDeconnecter } from '../../services/compte';
import { Accueil } from './Accueil';
import { AppRoutes } from '../../app/App';
import { ModeEditionProvider } from '../../app/modeEdition';

describe('Accueil', () => {
  it('le pro modifie le grand titre et la FAQ directement sur le site', async () => {
    await seConnecter('pro@example.org', 'motdepasse1');
    render(<MemoryRouter><AppRoutes /></MemoryRouter>);

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier : Titre, présentation et points forts' }));
    const fenetre = screen.getByRole('dialog', { name: 'Titre, présentation et points forts' });
    const titre = within(fenetre).getByLabelText('Grand titre');
    await userEvent.clear(titre);
    await userEvent.type(titre, 'Votre voiture comme neuve');
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Votre voiture comme neuve' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Modifier : Questions fréquentes' }));
    const faq = screen.getByRole('dialog', { name: 'Questions fréquentes' });
    await userEvent.click(within(faq).getByRole('button', { name: 'Ajouter la question' }));
    const champs = within(faq).getAllByLabelText(/^Question \d/);
    await userEvent.type(champs[champs.length - 1], 'Intervenez-vous le dimanche ?');
    await userEvent.click(within(faq).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Intervenez-vous le dimanche ?')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Modifier : Photo de l’accueil' })).toBeInTheDocument();
    // Section avis vide : visible pour le pro seulement, avec son crayon.
    expect(screen.getByRole('button', { name: 'Modifier : Avis clients' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier : Horaires et congés' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier : Zone et frais de déplacement' })).toBeInTheDocument();
    await seDeconnecter();
  });

  it('le pro connecté modifie une formule et ajoute une formule depuis le site', async () => {
    await seConnecter('pro@example.org', 'motdepasse1');
    render(<MemoryRouter><ModeEditionProvider><Accueil /></ModeEditionProvider></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Intérieur Éclat' }));
    const fenetre = screen.getByRole('dialog', { name: 'Modifier « Intérieur Éclat »' });
    const prix = within(fenetre).getByLabelText(/^Prix \(€\)/);
    await userEvent.clear(prix);
    await userEvent.type(prix, '35');
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));

    const eclat = (await screen.findByRole('heading', { level: 3, name: 'Intérieur Éclat' })).closest('article')!;
    expect(eclat).toHaveTextContent('35,00 €');
    expect(screen.getByText('« Intérieur Éclat » enregistrée.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Ajouter une formule « Nettoyage intérieur »/ }));
    const nouvelle = screen.getByRole('dialog', { name: 'Nouvelle formule' });
    await userEvent.type(within(nouvelle).getByLabelText(/^Nom/), 'Intérieur Express');
    await userEvent.type(within(nouvelle).getByLabelText(/^Prix \(€\)/), '19');
    await userEvent.click(within(nouvelle).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Intérieur Express' })).toBeInTheDocument();

    await seDeconnecter();
  });

  it('présente les prestations, les étapes, les réalisations, la zone, les avis et la FAQ', async () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    for (const titre of ['Prestations', 'Comment ça marche', 'Réalisations', 'Zone d’intervention', 'Questions fréquentes']) {
      expect(screen.getByRole('heading', { level: 2, name: titre })).toBeInTheDocument();
    }
    expect(await screen.findByRole('heading', { level: 2, name: 'Horaires' })).toBeInTheDocument();
  });

  it('affiche les prestations par catégorie, avec ce qui est compris et un lien de réservation', async () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const onglets = screen.getAllByRole('tab');
    expect(onglets.map((o) => o.textContent)).toEqual(['Nettoyage intérieur', 'Nettoyage extérieur', 'Formule complète', 'Rénovation des phares', 'Soins à la carte']);
    expect(onglets[0]).toHaveAttribute('aria-selected', 'true');

    const panneau = screen.getByRole('tabpanel');
    const signature = within(panneau).getByRole('heading', { level: 3, name: 'Intérieur Signature' }).closest('article')!;
    expect(signature).toHaveTextContent('Le plus choisi');
    expect(signature).toHaveTextContent('69,00 €');
    expect(within(signature).getByRole('list')).toHaveTextContent('Shampooing des tapis et moquettes');
    expect(within(signature).getByRole('link', { name: 'Choisir Intérieur Signature' })).toHaveAttribute('href', '/reserver?formule=int-signature');
    expect(within(panneau).getByRole('heading', { level: 3, name: 'Options' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Nettoyage extérieur' }));
    expect(screen.getByRole('tab', { name: 'Nettoyage extérieur' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { level: 3, name: 'Extérieur Éclat' })).toBeInTheDocument();

    // Formule complète : à partir de la formule la moins chère de chaque côté (29 € + 25 €), moins 15 €.
    await userEvent.click(screen.getByRole('tab', { name: 'Formule complète' }));
    const complete = within(screen.getByRole('tabpanel')).getByRole('heading', { level: 3, name: 'Formule complète' }).closest('article')!;
    expect(complete).toHaveTextContent(/à partir de\s*39,00/);
    expect(complete).toHaveTextContent('Intérieur + extérieur au choix · 15,00 € de moins');
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
      ['Abbeville + 5 kmOffert', '5 à 15 km5 €', '15 à 30 km10 €', '30 à 50 km20 €', 'Au-delà de 50 kmSur devis'],
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
    expect(within(section).getByRole('link', { name: 'Connectez-vous' })).toHaveAttribute('href', '/mon-espace');
  });

  it('montre au client connecté sa propre carte de fidélité', async () => {
    await seConnecter('camille@example.org', 'demo');
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    const section = await screen.findByRole('region', { name: 'Votre carte de fidélité' });
    expect(within(section).getByRole('status')).toHaveTextContent('Encore 2 prestations avant 20 % de remise.');
    expect(section).not.toHaveTextContent('Exemple');
    await seDeconnecter();
  });

  it('n’invente aucun avis ni photo : sans avis réel, la section avis est masquée', () => {
    render(<MemoryRouter><Accueil /></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Avis clients' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Réalisations' }).querySelectorAll('img')).toHaveLength(0);
  });
});
