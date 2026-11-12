/** Service de l'espace pro branché sur l'API (appels simulés) : routes /admin, corps conformes à docs/api.md, jeton envoyé. */
let fetchMock: ReturnType<typeof vi.fn>;

async function charger(corps: unknown = {}, status = 200) {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://api.exemple.test');
  fetchMock = vi.fn(async (url: string) => (url.endsWith('/auth/login')
    ? new Response(JSON.stringify({ token: 'pro-1', roles: ['ROLE_PRO'] }))
    : new Response(status === 204 ? null : JSON.stringify(corps), { status })));
  vi.stubGlobal('fetch', fetchMock);
  const compte = await import('./compte');
  await compte.seConnecter('pro@example.org', 'x');
  fetchMock.mockClear();
  return import('./pro');
}

const dernier = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    route: `${init.method ?? 'GET'} ${url.replace('https://api.exemple.test/api/v1', '')}`,
    auth: (init.headers as Record<string, string>).Authorization,
    body: init.body ? JSON.parse(String(init.body)) : undefined,
  };
};

describe('service espace pro', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('lit le tableau de bord et le planning avec le jeton', async () => {
    const pro = await charger([]);
    await pro.tableauDeBord();
    expect(dernier()).toMatchObject({ route: 'GET /admin/dashboard', auth: 'Bearer pro-1' });
    await pro.planning('2026-11-09', '2026-11-16');
    expect(dernier().route).toBe('GET /admin/reservations?from=2026-11-09&to=2026-11-16');
  });

  it('ajoute un rendez-vous pris par téléphone au format de la réservation en ligne', async () => {
    const pro = await charger({ reservationId: 'r1', status: 'pending_payment', paymentUrl: null });
    await pro.ajouterRendezVous({
      prestationId: 'p1', variante: 'suv', optionIds: [], metierData: { vehicleType: 'suv' }, start: '2026-11-20T07:30:00+00:00',
      address: { label: 'Rue', lat: 49.9, lng: 2.3 }, contact: { firstname: 'A', lastname: 'B', email: 'a@b.fr', phone: '06', notes: '' }, sendDepositLink: true,
    });
    expect(dernier()).toEqual({
      route: 'POST /admin/reservations', auth: 'Bearer pro-1',
      body: {
        prestationId: 'p1', variante: 'suv', optionIds: [], metierData: { vehicleType: 'suv' }, start: '2026-11-20T07:30:00+00:00',
        address: { label: 'Rue', lat: 49.9, lng: 2.3 }, firstname: 'A', lastname: 'B', email: 'a@b.fr', phone: '06', notes: '', sendDepositLink: true, acceptedTerms: true,
      },
    });
  });

  it('crée (POST) ou modifie (PUT) une prestation sans envoyer son identifiant dans le corps', async () => {
    const pro = await charger({});
    const p = { name: 'X', description: '', basePriceCents: 100, baseDurationMin: 30, active: true, categoryId: 'auto', position: 0, occupePlage: false, tarifs: {}, optionIds: [] };
    await pro.enregistrerPrestation(p);
    expect(dernier().route).toBe('POST /admin/catalog/prestations');
    await pro.enregistrerPrestation({ ...p, id: 'p1' });
    expect(dernier().route).toBe('PUT /admin/catalog/prestations/p1');
    expect(dernier().body).not.toHaveProperty('id');
  });

  it('remplace les horaires, ajoute un congé et passe en activité sur place', async () => {
    const pro = await charger({ id: 'i1' });
    await pro.definirHoraires([{ weekday: 1, startsAt: '08:00', endsAt: '12:00' }]);
    expect(dernier()).toMatchObject({ route: 'PUT /admin/availability/hours', body: { hours: [{ weekday: 1, startsAt: '08:00', endsAt: '12:00' }] } });
    expect(await pro.ajouterIndisponibilite('2026-12-24', '2026-12-27', 'Noël')).toBe('i1');
    expect(dernier()).toMatchObject({ route: 'POST /admin/availability/unavailabilities', body: { start: '2026-12-24', end: '2026-12-27', reason: 'Noël' } });
    await pro.enregistrerZone(null);
    expect(dernier()).toMatchObject({ route: 'PUT /admin/settings/zone', body: { zone: null } });
  });

  it('annule avec remboursement et marque un client absent', async () => {
    const pro = await charger({ refundedCents: 4470 });
    expect(await pro.annulerRendezVous('r1', true)).toEqual({ refundedCents: 4470 });
    expect(dernier()).toMatchObject({ route: 'POST /admin/reservations/r1/cancel', body: { refund: true } });
    await pro.changerStatut('r1', 'no_show');
    expect(dernier()).toMatchObject({ route: 'PATCH /admin/reservations/r1', body: { status: 'no_show' } });
  });
});
