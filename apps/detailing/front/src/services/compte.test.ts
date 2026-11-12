/** Service compte branché sur l'API (appels simulés) : jeton Bearer, renouvellement par cookie, liens reçus par e-mail. */
type Reponse = { status?: number; body?: unknown };

let fetchMock: ReturnType<typeof vi.fn>;

async function charger(reponses: Record<string, Reponse | Reponse[]>) {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://api.exemple.test');
  const files = Object.fromEntries(Object.entries(reponses).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));
  fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const cle = `${init.method ?? 'GET'} ${url.replace('https://api.exemple.test/api/v1', '')}`;
    const file = files[cle];
    const r = (file && file.length > 1 ? file.shift() : file?.[0]) ?? { status: 404, body: { detail: 'Introuvable' } };
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return import('./compte');
}

const appels = () => fetchMock.mock.calls.map(([url, init]: [string, RequestInit]) => ({
  route: `${init.method ?? 'GET'} ${url.replace('https://api.exemple.test/api/v1', '')}`,
  auth: (init.headers as Record<string, string>).Authorization,
  body: init.body ? JSON.parse(String(init.body)) : undefined,
  credentials: init.credentials,
}));

describe('service compte', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('se connecte puis envoie le jeton d’accès', async () => {
    const compte = await charger({
      'POST /auth/login': { body: { token: 'acces-1', expiresIn: 900, roles: ['ROLE_CLIENT'] } },
      'GET /me': { body: { id: 'u1', email: 'c@example.org' } },
    });
    await compte.seConnecter('c@example.org', 'motdepasse1');
    expect(compte.estConnecte()).toBe(true);
    await compte.monCompte();

    const [login, me] = appels();
    expect(login.body).toEqual({ email: 'c@example.org', password: 'motdepasse1' });
    expect(login.credentials).toBe('include');
    expect(me.auth).toBe('Bearer acces-1');
  });

  it('renouvelle la session une fois quand le jeton a expiré', async () => {
    const compte = await charger({
      'POST /auth/login': { body: { token: 'ancien', roles: [] } },
      'GET /me/reservations': [{ status: 401, body: { detail: 'Expiré' } }, { body: [] }],
      'POST /auth/refresh': { body: { token: 'nouveau', roles: [] } },
    });
    await compte.seConnecter('c@example.org', 'x');
    expect(await compte.mesRendezVous()).toEqual([]);
    expect(appels().map((a) => `${a.route} ${a.auth ?? ''}`.trim())).toEqual([
      'POST /auth/login',
      'GET /me/reservations Bearer ancien',
      'POST /auth/refresh',
      'GET /me/reservations Bearer nouveau',
    ]);
  });

  it('reprend une session depuis le cookie, ou non', async () => {
    let compte = await charger({ 'POST /auth/refresh': { body: { token: 't', roles: ['ROLE_CLIENT'] } } });
    expect(await compte.reprendreSession()).toBe(true);
    compte = await charger({ 'POST /auth/refresh': { status: 401, body: { detail: 'Session expirée' } } });
    expect(await compte.reprendreSession()).toBe(false);
    expect(compte.estConnecte()).toBe(false);
  });

  it('déplace et annule un rendez-vous de l’espace client', async () => {
    const compte = await charger({
      'POST /auth/login': { body: { token: 't', roles: [] } },
      'PATCH /me/reservations/r1': { status: 204 },
      'DELETE /me/reservations/r1': { body: { refundable: true } },
    });
    await compte.seConnecter('c@example.org', 'x');
    await compte.deplacerMonRendezVous('r1', '2026-11-20T07:30:00+00:00');
    expect(await compte.annulerMonRendezVous('r1')).toEqual({ refundable: true });
    expect(appels()[1].body).toEqual({ start: '2026-11-20T07:30:00+00:00' });
  });

  it('utilise les liens reçus par e-mail (activation, mot de passe, gestion du rendez-vous)', async () => {
    const compte = await charger({
      'POST /auth/activate': { status: 204 },
      'POST /auth/forgot': { status: 202, body: {} },
      'POST /auth/reset': { status: 204 },
      'GET /booking/manage/jeton%2F1': { body: { id: 'r1' } },
      'DELETE /booking/manage/jeton%2F1': { body: { refundable: false } },
    });
    await compte.activerCompte('a1', 'motdepasse1');
    await compte.demanderNouveauMotDePasse('c@example.org');
    await compte.choisirNouveauMotDePasse('r1', 'motdepasse2');
    expect((await compte.rendezVousParLien('jeton/1')).id).toBe('r1');
    expect(await compte.annulerParLien('jeton/1')).toEqual({ refundable: false });
    expect(appels().map((a) => a.body)).toEqual([
      { token: 'a1', password: 'motdepasse1' }, { email: 'c@example.org' }, { token: 'r1', password: 'motdepasse2' }, undefined, undefined,
    ]);
  });

  it('valide le mot de passe comme l’API', async () => {
    const { motDePasseValide } = await charger({});
    expect(motDePasseValide('court1')).toBe(false);
    expect(motDePasseValide('sanschiffres')).toBe(false);
    expect(motDePasseValide('1234567890')).toBe(false);
    expect(motDePasseValide('éléphant42')).toBe(true);
  });
});
