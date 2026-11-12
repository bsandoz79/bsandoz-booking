import { CONTENU_PAR_DEFAUT, fusionner } from './contenu';

describe('contenu du site', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('complète le contenu enregistré avec les textes par défaut', () => {
    const c = fusionner({ coordonnees: { telephone: '06 11 22 33 44' }, faq: [], avis: 'invalide' } as never);
    expect(c.coordonnees.telephone).toBe('06 11 22 33 44');
    expect(c.coordonnees.horaires).toBe(CONTENU_PAR_DEFAUT.coordonnees.horaires);
    expect(c.faq).toEqual([]);
    expect(c.avis).toEqual(CONTENU_PAR_DEFAUT.avis);
    expect(c.etapes).toEqual(CONTENU_PAR_DEFAUT.etapes);
  });

  it('lit, enregistre et envoie une photo via l’API', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.exemple.test');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/login')) return new Response(JSON.stringify({ token: 'pro', roles: ['ROLE_PRO'] }));
      if (url.endsWith('/admin/medias')) return new Response(JSON.stringify({ name: 'a.jpg', url: 'https://api.exemple.test/medias/a.jpg' }), { status: 201 });
      return new Response(JSON.stringify({ coordonnees: { email: 'contact@exemple.fr' } }));
    });
    vi.stubGlobal('fetch', fetchMock);
    await (await import('./compte')).seConnecter('pro@exemple.fr', 'x');
    const contenu = await import('./contenu');

    expect((await contenu.chargerContenu()).coordonnees.email).toBe('contact@exemple.fr');
    await contenu.enregistrerContenu(contenu.CONTENU_PAR_DEFAUT);
    const url = await contenu.envoyerPhoto(new File(['x'], 'avant.jpg', { type: 'image/jpeg' }));

    expect(url).toBe('https://api.exemple.test/medias/a.jpg');
    const appels = (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([u, init]) => ({ u: u.replace('https://api.exemple.test/api/v1', ''), init }));
    expect(appels[1].u).toBe('/site');
    expect(appels[2]).toMatchObject({ u: '/admin/site', init: { method: 'PUT' } });
    expect((appels[2].init.headers as Record<string, string>).Authorization).toBe('Bearer pro');
    expect(appels[3].u).toBe('/admin/medias');
    expect(appels[3].init.body).toBeInstanceOf(FormData);
    expect(appels[3].init.headers as Record<string, string>).not.toHaveProperty('Content-Type');
  });

  it('refuse une photo de plus de 5 Mo avant l’envoi', async () => {
    const { envoyerPhoto } = await import('./contenu');
    const lourde = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'lourde.jpg', { type: 'image/jpeg' });
    await expect(envoyerPhoto(lourde)).rejects.toThrow('5 Mo');
  });
});
