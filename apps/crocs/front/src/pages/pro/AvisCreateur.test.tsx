import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createur } from '../../data/createur';
import { AvisCreateur } from './AvisCreateur';

const LIEN = 'https://g.page/r/exemple/review';

/** Faux serveur : contenu du site (avec ou sans « avis laissé »), garde la trace des enregistrements. */
function fauxServeur(contenu: Record<string, unknown>) {
  const envois: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url.endsWith('/admin/site') && init.method === 'PUT') {
      envois.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify(envois.at(-1)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(contenu), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
  return envois;
}

describe('Demande d’avis Google pour le créateur du site', () => {
  const initial = createur.avisGoogle;
  beforeEach(() => { vi.stubEnv('VITE_API_URL', 'https://api.example.test'); createur.avisGoogle = LIEN; });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); createur.avisGoogle = initial; });

  it('reste affichée tant que le patron n’a pas dit « C’est fait » ; le lien ouvre la fiche Google', async () => {
    fauxServeur({ accroche: 'Bonjour' });
    render(<AvisCreateur />);
    const lien = await screen.findByRole('link', { name: /Laisser un avis/ });
    expect(lien).toHaveAttribute('href', LIEN);
    expect(lien).toHaveAttribute('target', '_blank');
  });

  it('« C’est fait » l’enregistre (sans toucher au reste du contenu) et la retire', async () => {
    const envois = fauxServeur({ accroche: 'Bonjour' });
    render(<AvisCreateur />);
    await userEvent.click(await screen.findByRole('button', { name: /C’est fait/ }));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Laisser un avis/ })).not.toBeInTheDocument());
    expect(envois).toEqual([{ accroche: 'Bonjour', avisCreateurLaisse: true }]);
  });

  it('avis déjà laissé : rien n’est affiché', async () => {
    fauxServeur({ avisCreateurLaisse: true });
    const { container } = render(<AvisCreateur />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('sans lien de fiche Google : rien n’est affiché, aucun appel', () => {
    createur.avisGoogle = '';
    const envois = fauxServeur({});
    const { container } = render(<AvisCreateur />);
    expect(container).toBeEmptyDOMElement();
    expect(envois).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
