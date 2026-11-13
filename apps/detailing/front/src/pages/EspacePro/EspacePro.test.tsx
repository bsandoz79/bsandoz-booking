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
    expect(screen.getByText('Paiements en ligne en attente')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prochains rendez-vous' })).toBeInTheDocument();
  });

  it('montre ma journée (itinéraire, appel), les choses à faire, les chiffres et les clients', async () => {
    await ouvrirConnecte();
    const journee = await screen.findByRole('region', { name: 'Ma journée' });
    expect(within(journee).getByText('Client démo A')).toBeInTheDocument();
    await userEvent.click(within(journee).getByRole('button', { name: 'Itinéraire vers Client démo A' }));
    const choix = screen.getByRole('dialog', { name: 'Ouvrir l’itinéraire avec…' });
    expect(within(choix).getByRole('link', { name: 'Google Maps' })).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir'));
    expect(within(choix).getByRole('link', { name: 'Waze' })).toHaveAttribute('href', expect.stringContaining('waze.com/ul?ll=50.1054,1.8332'));
    await userEvent.keyboard('{Escape}');
    expect(within(journee).getByRole('link', { name: /Appeler 01 02 03 04 05/ })).toHaveAttribute('href', 'tel:0102030405');
    expect(screen.getByRole('region', { name: 'Mon prochain rendez-vous' })).toHaveTextContent(/Client démo [AB]/);
    const aFaire = screen.getByRole('region', { name: /Choses à faire/ });
    expect(within(aFaire).getByText(/Paiement en ligne attendu : Client démo C/)).toBeInTheDocument();
    expect(within(aFaire).getByText(/Informations de facturation à compléter/)).toBeInTheDocument();
    expect(screen.getByText('Panier moyen')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Clients' })).getByText('Personne pour le moment.')).toBeInTheDocument();
  });

  it('clients : tri par nom (A→Z, Z→A), filtres rapides et résumé', async () => {
    await ouvrirConnecte();
    await rubrique('Clients');
    const noms = () => within(screen.getByRole('list', { name: 'Liste des clients' })).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect((await screen.findByRole('list', { name: 'Liste des clients' }))).toBeInTheDocument();
    expect(noms()[0]).toBe('Voir la fiche de Client démo A');
    await userEvent.selectOptions(screen.getByLabelText('Trier par'), 'nom-inverse');
    expect(noms()[0]).toBe('Voir la fiche de Client démo C');

    await userEvent.click(within(screen.getByRole('group', { name: 'Filtrer les clients' })).getByRole('button', { name: /Rendez-vous à venir/ }));
    expect(noms()).toContain('Voir la fiche de Client démo B');
    expect(noms()).not.toContain('Voir la fiche de Client démo C');
    expect(screen.getByRole('list', { name: 'Résumé de la sélection' })).toHaveTextContent(/client/);
  });

  it('ouvre la fiche d’un client et corrige son avoir', async () => {
    await ouvrirConnecte();
    await rubrique('Clients');
    await userEvent.type(await screen.findByLabelText(/Rechercher un client/), 'démo b');
    await userEvent.click(screen.getByRole('button', { name: 'Voir la fiche de Client démo B' }));
    expect(await screen.findByRole('heading', { level: 2, name: /Client démo B/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Appeler 01 02 03 04 05/ })).toHaveAttribute('href', 'tel:0102030405');
    const avoir = screen.getByLabelText(/Montant de l’avoir/);
    await userEvent.clear(avoir);
    await userEvent.type(avoir, '15');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer l’avoir' }));
    expect(await screen.findByText(/Avoir de 15,00\s€ enregistré/)).toBeInTheDocument();
    expect(screen.getByText('Intérieur Signature', { exact: false })).toBeInTheDocument();
  });

  it('ajoute une dépense mensuelle et la voit dans le résultat du mois', async () => {
    await ouvrirConnecte();
    await rubrique('Comptabilité');
    await userEvent.type(await screen.findByLabelText(/^Libellé/), 'Assurance');
    await userEvent.type(screen.getByLabelText(/^Montant/), '40');
    await userEvent.click(screen.getByRole('switch', { name: /Dépense mensuelle/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter la dépense' }));
    expect(await screen.findByText('Dépense « Assurance » ajoutée.')).toBeInTheDocument();
    expect(await screen.findByText(/40,00\s€ par mois/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Arrêter Assurance' }));
    expect(await screen.findByText('« Assurance » arrêtée.')).toBeInTheDocument();
  });

  it('montre l’aperçu de la carte en direct pendant la modification d’une prestation', async () => {
    await ouvrirConnecte();
    await rubrique('Catalogue');
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Intérieur Éclat' }));
    const apercu = screen.getByRole('complementary', { name: 'Aperçu sur le site' });
    expect(within(apercu).getByRole('heading', { name: 'Intérieur Éclat' })).toBeInTheDocument();
    const prix = screen.getByLabelText(/^Prix \(€\)/);
    await userEvent.clear(prix);
    await userEvent.type(prix, '33');
    expect(apercu).toHaveTextContent('33,00 €');
    await userEvent.type(screen.getByLabelText(/Mise en avant/), 'Nouveau');
    expect(apercu).toHaveTextContent('Nouveau');
  });

  it('historique : une ligne par rendez-vous, filtres par statut et nom, tri, fiche au clic', async () => {
    await ouvrirConnecte();
    await rubrique('Historique');
    const liste = await screen.findByRole('list', { name: 'Rendez-vous' });
    expect(within(liste).getAllByRole('listitem')).toHaveLength(3);
    expect(liste).toHaveTextContent(/Réservé le/);

    await userEvent.click(within(screen.getByRole('group', { name: 'Filtrer par statut' })).getByRole('button', { name: 'Paiement en attente' }));
    expect(within(screen.getByRole('list', { name: 'Rendez-vous' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Rendez-vous' })).toHaveTextContent('Client démo C');
    await userEvent.click(screen.getByRole('button', { name: 'Tous' }));

    await userEvent.selectOptions(screen.getByLabelText('Trier par'), 'rdv-ancien');
    expect(within(screen.getByRole('list', { name: 'Rendez-vous' })).getAllByRole('listitem')[0]).toHaveTextContent('Client démo A');
    await userEvent.type(screen.getByLabelText('Rechercher'), 'démo b');
    const ligne = within(screen.getByRole('list', { name: 'Rendez-vous' })).getByRole('button', { name: /Client démo B/ });
    await userEvent.click(ligne);
    expect(screen.getByRole('region', { name: /Rendez-vous du/ })).toHaveTextContent('Intérieur Signature');
  });

  it('règle le lien d’avis Google joint au mail de fin de prestation', async () => {
    await ouvrirConnecte();
    await rubrique('Réglages');
    const lien = await screen.findByLabelText(/Lien de votre page d’avis/);
    await userEvent.type(lien, 'pas-un-lien');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await userEvent.clear(lien);
    await userEvent.type(lien, 'https://g.page/r/exemple/review');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Demande d’avis activée.')).toBeInTheDocument();
  });

  it('ajoute un tampon de fidélité au client depuis le détail du rendez-vous', async () => {
    await ouvrirConnecte();
    await rubrique('Planning');
    await userEvent.click(screen.getByRole('button', { name: 'Jour' }));
    await userEvent.click(await screen.findByRole('button', { name: /Client démo A · Intérieur Éclat/ }));
    const detail = screen.getByRole('region', { name: /Rendez-vous du/ });
    expect(await within(detail).findByText('0 / 4')).toBeInTheDocument();
    await userEvent.click(within(detail).getByRole('button', { name: 'Ajouter un tampon' }));
    expect(await within(detail).findByText('1 / 4')).toBeInTheDocument();
  });

  it('affiche le planning et le détail d’un rendez-vous avec les coordonnées du client', async () => {
    await ouvrirConnecte();
    await rubrique('Planning');
    await userEvent.click(screen.getByRole('button', { name: 'Jour' }));
    await userEvent.click(await screen.findByRole('button', { name: /Client démo A · Intérieur Éclat/ }));
    const detail = screen.getByRole('region', { name: /Rendez-vous du/ });
    expect(within(detail).getByRole('link', { name: /Appeler 01 02 03 04 05/ })).toHaveAttribute('href', 'tel:0102030405');
    // Fiche compacte : client, prestation, paiement ; contact tout en bas.
    expect(detail).toHaveTextContent(/Client.*Client démo A.*Prestation.*Intérieur Éclat.*Paiement.*À encaisser sur place/);
    expect(within(detail).getByRole('link', { name: /Écrire/ })).toHaveAttribute('href', 'mailto:client@example.org');
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

  it('catalogue rangé par catégorie : prix, durée, étiquettes, modifier et retirer', async () => {
    await ouvrirConnecte();
    await rubrique('Catalogue');
    const interieur = await screen.findByRole('region', { name: 'Nettoyage intérieur' });
    expect(interieur).toHaveTextContent(/Intérieur Signature.*À partir de 69,00\s€.*demi-journée/);
    expect(interieur).toHaveTextContent('Le plus choisi');
    await userEvent.click(within(interieur).getByRole('button', { name: 'Retirer Intérieur Éclat' }));
    expect(await screen.findByRole('status')).toHaveTextContent('« Intérieur Éclat » n’est plus proposée.');
    expect(within(screen.getByRole('region', { name: 'Nettoyage intérieur' })).getByText('Retirée du site')).toBeInTheDocument();

    // Filtres : une catégorie, puis une recherche par nom.
    await userEvent.click(within(screen.getByRole('group', { name: 'Filtrer par catégorie' })).getByRole('button', { name: 'Rénovation des phares' }));
    expect(screen.queryByRole('region', { name: 'Nettoyage intérieur' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rénovation des phares' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toutes' }));
    await userEvent.type(screen.getByLabelText('Rechercher une prestation'), 'ciel');
    expect(screen.getByRole('region', { name: 'Soins à la carte' })).toHaveTextContent('Ciel de toit');
    expect(screen.queryByRole('region', { name: 'Nettoyage extérieur' })).not.toBeInTheDocument();
  });

  it('réordonne les options : le désodorisant remonte en première position', async () => {
    await ouvrirConnecte();
    await rubrique('Catalogue');
    const ordre = await screen.findByRole('list', { name: 'Ordre des options' });
    expect(within(ordre).getAllByRole('listitem')[0]).toHaveTextContent('Poils d’animaux');
    within(ordre).getByRole('button', { name: 'Déplacer Désodorisant Perfect Clean' }).focus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(await screen.findByRole('status')).toHaveTextContent('Nouvel ordre enregistré');
    expect(within(screen.getByRole('list', { name: 'Ordre des options' })).getAllByRole('listitem')[0]).toHaveTextContent('Désodorisant Perfect Clean');
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
