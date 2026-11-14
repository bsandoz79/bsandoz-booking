import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { Reserver } from './Reserver';
import { seConnecter, seDeconnecter } from '../../services/compte';
import { souscrire } from '../../services/abonnements';

const bouton = (nom: string | RegExp) => screen.getByRole('button', { name: nom });

/** Base Adresse Nationale simulée (mode démo : appel direct depuis le navigateur). */
function simulerBan() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    features: [{ properties: { label: '1 Place Max Lejeune 80100 Abbeville' }, geometry: { coordinates: [1.8357, 50.1054] } }],
  }))));
}

describe('Parcours de réservation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T09:00:00'));
    simulerBan();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('affiche le prix dès le choix de la formule, sans demander le véhicule', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);

    expect(bouton('Choisir le créneau')).toBeDisabled();
    expect(screen.queryByLabelText('Marque')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage intérieur' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Intérieur Signature/ }));
    expect(await screen.findByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText(/69,00/).length).toBeGreaterThan(0);
    expect(bouton('Choisir le créneau')).toBeEnabled();
  });

  it('formule complète : une formule intérieur et une extérieur au choix, 15 € de moins, phares en option', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Formule complète' }));
    // Seule formule de la catégorie : déjà choisie, il reste à composer.
    expect(bouton('Choisir le créneau')).toBeDisabled();
    const interieur = screen.getByRole('group', { name: 'Votre formule intérieur' });
    await userEvent.click(within(interieur).getByRole('radio', { name: /Intérieur Signature/ }));
    expect(bouton('Choisir le créneau')).toBeDisabled();
    await userEvent.click(within(screen.getByRole('group', { name: 'Votre formule extérieur' })).getByRole('radio', { name: /Extérieur Éclat/ }));

    // 69 € + 25 € − 15 € ; options de la formule complète et des formules choisies.
    expect(await screen.findByText('Remise Formule complète')).toBeInTheDocument();
    expect(screen.getAllByText(/79,00/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('checkbox', { name: /Rénovation des phares/ }));
    expect(screen.getByRole('checkbox', { name: /Poils d’animaux/ })).toBeInTheDocument();
    expect((await screen.findAllByText(/124,00/)).length).toBeGreaterThan(0);
    expect(bouton('Choisir le créneau')).toBeEnabled();
  });

  it('abonnement : la formule comprise est déduite, les options restent dues', async () => {
    await souscrire('abo-mois');
    render(<MemoryRouter initialEntries={['/reserver?formule=ext-eclat&abonnement=abonnement-demo']}><Reserver /></MemoryRouter>);
    expect(await screen.findByText(/Compris dans votre abonnement « Lavage chaque mois »/)).toBeInTheDocument();
    expect(await screen.findByText('Compris dans votre abonnement')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /Véhicule très sale/ }));
    expect((await screen.findAllByText(/10,00/)).length).toBeGreaterThan(0);
  });

  it('passe tout seul à « Où et quand ? » quand la formule n’a pas d’option à proposer', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Soins à la carte' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Ciel de toit/ }));
    expect(screen.getByRole('heading', { name: 'Où et quand ?' }).closest('section')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Modifier : Que faut-il nettoyer ?' })).toBeInTheDocument();
  });

  it('plusieurs véhicules : même formule pour tous, options choisies véhicule par véhicule', async () => {
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage intérieur' }));
    await userEvent.click(screen.getByRole('button', { name: 'Un véhicule de plus' }));
    await userEvent.click(screen.getByRole('button', { name: 'Un véhicule de plus' }));
    expect(screen.getByRole('group', { name: 'Nombre de véhicules' })).toHaveTextContent('3');

    await userEvent.click(await screen.findByRole('radio', { name: /Intérieur Éclat/ }));
    expect(screen.getByRole('group', { name: 'Véhicule 3' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /Poils d’animaux.*véhicule 1/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Poils d’animaux.*véhicule 3/ }));

    expect(await screen.findByText('Intérieur Éclat × 3')).toBeInTheDocument();
    expect(await screen.findByText(/Poils d’animaux.* × 2/)).toBeInTheDocument();
  });

  it('trouve l’adresse avec « Utiliser ma position », puis propose le calendrier', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 50.1054, longitude: 1.8357 } } as GeolocationPosition) } });
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Soins à la carte' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Ciel de toit/ }));

    await userEvent.click(screen.getByRole('button', { name: /Utiliser ma position/ }));
    expect(await screen.findByText(/déplacement offert/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Adresse de l'intervention/ })).toHaveValue('1 Place Max Lejeune 80100 Abbeville');
  });

  it('explique quoi faire si la position est refusée', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (_: PositionCallback, ko: PositionErrorCallback) => ko({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError) } });
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Soins à la carte' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Ciel de toit/ }));
    await userEvent.click(screen.getByRole('button', { name: /Utiliser ma position/ }));
    expect(await screen.findByText(/Position refusée/)).toBeInTheDocument();
  });

  it('client connecté : coordonnées pré-remplies, modifiables pour réserver pour quelqu’un d’autre', async () => {
    await seConnecter('camille@example.org', 'motdepasse1');
    render(<MemoryRouter><Reserver /></MemoryRouter>);
    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage extérieur' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Extérieur Éclat/ }));
    await userEvent.click(bouton('Choisir le créneau'));
    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'intervention/ }), '1 place max');
    await userEvent.click(await screen.findByRole('option', { name: /Abbeville/ }));
    await userEvent.click(await screen.findByRole('button', { name: /vendredi 13 novembre 2026/ }));
    await userEvent.click(await screen.findByRole('button', { name: '10:30' }));
    const nom = await screen.findByDisplayValue('Camille Martin');
    expect(screen.getByDisplayValue('camille@example.org')).toBeInTheDocument();
    expect(screen.getByText(/Vous réservez pour quelqu’un d’autre/)).toBeInTheDocument();
    await userEvent.clear(nom);
    await userEvent.type(nom, 'Alex Durand');
    expect(screen.getByDisplayValue('Alex Durand')).toBeInTheDocument();
    await seDeconnecter();
  });

  it('présélectionne la formule choisie sur l’accueil', async () => {
    render(<MemoryRouter initialEntries={['/reserver?formule=ext-signature']}><Reserver /></MemoryRouter>);
    expect(await screen.findByRole('radio', { name: 'Nettoyage extérieur' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('radio', { name: /Extérieur Signature/, checked: true })).toBeInTheDocument();
  });

  it('va jusqu’au paiement de l’acompte (démo) : extérieur, adresse, créneau, coordonnées, CGV', async () => {
    render(<MemoryRouter initialEntries={['/reserver']}><AppRoutes /></MemoryRouter>);

    await userEvent.click(screen.getByRole('radio', { name: 'Nettoyage extérieur' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Extérieur Éclat/ }));
    await userEvent.click(bouton('Choisir le créneau'));

    // Étape 1 repliée en résumé, étape 2 ouverte : adresse puis créneau.
    expect(screen.getByRole('button', { name: 'Modifier : Que faut-il nettoyer ?' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'intervention/ }), '1 place max');
    await userEvent.click(await screen.findByRole('option', { name: /Abbeville/ }));
    expect(await screen.findByText(/déplacement offert/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /vendredi 13 novembre 2026/ }));
    // Choisir l'heure ouvre directement l'étape des coordonnées.
    expect(await screen.findByRole('button', { name: '13:30, Conseillé' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '10:30' }));
    expect(screen.getByRole('heading', { name: 'Vos coordonnées' }).closest('section')).toHaveAttribute('aria-current', 'step');

    expect(screen.getByText(/ven\. 13 nov\..*Abbeville/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nom et prénom'), 'Camille Martin');
    await userEvent.type(screen.getByLabelText('Téléphone'), '0600000000');
    await userEvent.type(screen.getByLabelText(/^E-mail/), 'camille@example.org');
    await userEvent.type(screen.getByLabelText('Modèle du véhicule'), 'Peugeot 208 grise');

    // Entreprise : SIRET contrôlé (14 chiffres, ou 10 pour un n° BCE belge).
    await userEvent.click(screen.getByRole('checkbox', { name: 'Je réserve pour une entreprise' }));
    await userEvent.type(screen.getByLabelText(/^Nom de l’entreprise/), 'Transports Martin');
    await userEvent.type(screen.getByLabelText(/^SIRET/), '123');
    expect(screen.getByText('SIRET : 14 chiffres ; BCE : 10 chiffres.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^SIRET/), '45678901234');

    // Pas d'acompte : sur place par défaut (rien à payer maintenant), ou tout en ligne.
    await userEvent.click(screen.getByRole('checkbox', { name: /J'accepte les/ }));
    expect(screen.getByRole('button', { name: 'Confirmer la réservation' })).toBeEnabled();
    await userEvent.click(screen.getByRole('radio', { name: /En ligne, maintenant/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Payer 25,00/ }));

    // Au clic : les produits sont proposés dans une fenêtre, puis le paiement suit.
    const fenetre = await screen.findByRole('dialog', { name: 'Un petit plus pour l’entretien ?' });
    expect(within(fenetre).getByRole('button', { name: 'Ajouter et payer' })).toBeDisabled();
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Ajouter Microfibre' }));
    await userEvent.click(within(fenetre).getByRole('button', { name: /Ajouter et payer \(30,00/ }));

    expect(await screen.findByRole('heading', { name: 'Merci, votre rendez-vous est réservé.' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Mode démonstration');
  });

  it('adresse au-delà de la zone : propose de demander un devis', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      features: [{ properties: { label: '10 Rue de Rivoli 75001 Paris' }, geometry: { coordinates: [2.36, 48.856] } }],
    }))));
    render(<MemoryRouter initialEntries={['/reserver?formule=ext-signature']}><Reserver /></MemoryRouter>);
    await screen.findByRole('radio', { name: /Extérieur Signature/, checked: true });
    await userEvent.click(bouton('Choisir le créneau'));
    await userEvent.type(screen.getByRole('combobox', { name: /Adresse de l'intervention/ }), '10 rue de rivoli');
    await userEvent.click(await screen.findByRole('option', { name: /Paris/ }));

    expect(await screen.findByText(/au-delà de ma zone de réservation en ligne/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demander un devis' })).toHaveAttribute('href', '/devis?adresse=10%20Rue%20de%20Rivoli%2075001%20Paris');
  });

  it('prévient quand le paiement de l’acompte a été abandonné', () => {
    render(<MemoryRouter initialEntries={['/reserver?paiement=annule&reservation=r1']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('paiement de l\'acompte a été annulé');
  });
});
