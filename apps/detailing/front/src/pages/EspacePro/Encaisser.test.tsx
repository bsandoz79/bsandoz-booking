import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RendezVousPro } from '../../services/pro';

const encaisser = vi.fn(async () => undefined);
const lienPaiementQr = vi.fn(async () => 'https://checkout.stripe.com/c/pay/cs_test_1');
const rendezVousPro = vi.fn(async (): Promise<Partial<RendezVousPro>> => ({ moyenSurPlace: null }));
vi.mock('../../services/pro', () => ({ encaisser, lienPaiementQr, rendezVousPro }));
const { Encaisser } = await import('./Encaisser');

const rdv = { id: 'r1', client: { name: 'Camille Martin', email: '', phone: '' }, prestation: 'Intérieur Éclat', surPlaceCents: 7000 } as RendezVousPro;

describe('Encaisser', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('note le moyen de paiement choisi', async () => {
    const onEncaisse = vi.fn();
    render(<Encaisser rdv={rdv} onClose={() => undefined} onEncaisse={onEncaisse} />);
    expect(screen.getByRole('dialog', { name: /Encaisser 70,00/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisissez un moyen de paiement' })).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: 'Espèces' }));
    expect(screen.getByRole('radio', { name: 'Espèces' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: /^Encaisser 70,00/ }));

    expect(encaisser).toHaveBeenCalledWith('r1', 'especes');
    expect(onEncaisse).toHaveBeenCalledWith(expect.stringMatching(/encaissés \(espèces\)/));
  });

  it('affiche un QR code puis voit arriver le paiement du client', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Encaisser rdv={rdv} onClose={() => undefined} onEncaisse={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: /Afficher un QR code/ }));

    expect(lienPaiementQr).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('img', { name: 'QR code de paiement' })).toBeInTheDocument();
    expect(screen.getByText(/En attente du paiement/)).toBeInTheDocument();

    rendezVousPro.mockResolvedValue({ moyenSurPlace: 'qr' });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(screen.getByText('Paiement reçu')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
