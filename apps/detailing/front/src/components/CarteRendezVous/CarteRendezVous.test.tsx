import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RendezVous } from '../../services/compte';
import { CarteRendezVous } from './CarteRendezVous';

const MAINTENANT = new Date('2026-11-12T09:00:00Z');
const impaye: RendezVous = {
  id: 'r1', status: 'expired', prestationId: 'int-eclat', optionIds: [], start: '2026-11-17T08:00:00Z', end: '2026-11-17T09:30:00Z',
  address: '1 Place Max Lejeune 80100 Abbeville', lat: 50.1054, lng: 1.8357, totalCents: 2900, depositCents: 870,
  freeCancelUntil: '2026-11-15T08:00:00Z', produitsCents: 500,
};

describe('CarteRendezVous : acompte non réglé', () => {
  it('propose de payer l’acompte et les produits, puis ouvre la page de paiement', async () => {
    const naviguer = vi.fn();
    const onPayer = vi.fn(async () => 'https://paiement.test/cs_1');
    render(<CarteRendezVous rdv={impaye} maintenant={MAINTENANT} onDeplacer={vi.fn()} onAnnuler={vi.fn()} onPayer={onPayer} naviguer={naviguer} />);

    expect(screen.getByText('Acompte non réglé')).toBeInTheDocument();
    expect(screen.getByText(/pas encore confirmé : réglez l’acompte et les produits \(13,70\s€\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Payer l’acompte \(13,70/ }));

    expect(onPayer).toHaveBeenCalledOnce();
    expect(naviguer).toHaveBeenCalledWith('https://paiement.test/cs_1');
  });

  it('créneau repris entre-temps : propose d’en choisir un autre', async () => {
    const erreur = Object.assign(new Error('Ce créneau n’est plus disponible : choisissez-en un autre, puis réglez l’acompte.'), { status: 409 });
    render(<CarteRendezVous rdv={impaye} maintenant={MAINTENANT} onDeplacer={vi.fn()} onAnnuler={vi.fn()} onPayer={async () => { throw erreur; }} naviguer={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Payer l’acompte/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('plus disponible');
    expect(screen.getByText('Choisissez un nouveau créneau.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir ce créneau et payer' })).toBeDisabled();
  });

  it('peut être annulée sans rien à rembourser', async () => {
    render(<CarteRendezVous rdv={impaye} maintenant={MAINTENANT} onDeplacer={vi.fn()} onAnnuler={vi.fn(async () => ({ refundable: false }))} onPayer={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByText(/Rien n’a été payé/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Oui, annuler' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Rendez-vous annulé.');
  });
});
