import type { Formule } from '../data/demo';

/** Client branché sur l'API réelle (VITE_API_URL renseignée) : chemins, paramètres et corps conformes à docs/api.md. */
const formule: Formule = {
  id: 'p1', category: 'interieur', name: 'Complet', description: '', occupePlage: true, basePriceCents: 14900, baseDurationMin: 180,
  tarifs: { suv: { priceCents: 14900, durationMin: 180 } }, optionIds: ['o1'],
};
const adresse = { label: '10 Rue X 80000 Amiens', lat: 49.89, lng: 2.29 };
const selection = { formule, variante: 'suv', optionIds: ['o1'], metierData: { category: 'auto', vehicleType: 'suv' } };

let fetchMock: ReturnType<typeof vi.fn>;

async function chargerApi(reponse: unknown, status = 200) {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://api.exemple.test/');
  fetchMock = vi.fn(async () => new Response(JSON.stringify(reponse), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return import('./api');
}

const appel = () => fetchMock.mock.calls[0] as [string, RequestInit];

describe('client API', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('lit le catalogue sur /api/v1/catalog', async () => {
    const api = await chargerApi({ formules: [], options: [] });
    expect(api.isDemo()).toBe(false);
    await api.getCatalog();
    expect(appel()[0]).toBe('https://api.exemple.test/api/v1/catalog');
  });

  it('demande le devis avec la prestation, la variante, les données métier et l’adresse', async () => {
    const api = await chargerApi({ lines: [], totalCents: 0, depositCents: 0, durationMin: 180, travelFeeCents: 0, inZone: true });
    await api.getQuote(selection, adresse);
    const [url, init] = appel();
    expect(url).toBe('https://api.exemple.test/api/v1/booking/quote');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ prestationId: 'p1', variante: 'suv', optionIds: ['o1'], metierData: { category: 'auto', vehicleType: 'suv' }, lat: 49.89, lng: 2.29 });
  });

  it('transmet la prestation pour les jours et les créneaux (durée incertaine)', async () => {
    const api = await chargerApi([]);
    await api.getAvailableDays('2026-11', 180, adresse, 'p1');
    expect(appel()[0]).toBe('https://api.exemple.test/api/v1/booking/days?month=2026-11&duration=180&lat=49.89&lng=2.29&prestation=p1');

    fetchMock.mockClear();
    await api.getSlots('2026-11-13', 180, adresse, formule);
    expect(appel()[0]).toBe('https://api.exemple.test/api/v1/booking/slots?date=2026-11-13&duration=180&lat=49.89&lng=2.29&prestation=p1');
  });

  it('envoie la réservation au format de l’API et renvoie l’URL de paiement', async () => {
    const api = await chargerApi({ reservationId: 'r1', status: 'pending_payment', paymentUrl: 'https://checkout.stripe.test/s' }, 201);
    const contact = { firstname: 'Camille', lastname: 'Martin', email: 'c@example.org', phone: '0600000000', notes: '' };
    const resultat = await api.reserve(selection, '2026-11-13T07:30:00+00:00', adresse, contact, true);

    expect(resultat.paymentUrl).toBe('https://checkout.stripe.test/s');
    expect(JSON.parse(String(appel()[1].body))).toEqual({
      prestationId: 'p1', variante: 'suv', optionIds: ['o1'], metierData: { category: 'auto', vehicleType: 'suv' },
      start: '2026-11-13T07:30:00+00:00', address: adresse, ...contact, acceptedTerms: true, produits: [],
    });
  });

  it('remonte le détail d’une erreur problem+json avec son statut', async () => {
    const api = await chargerApi({ title: 'Unprocessable', status: 422, detail: 'Ce créneau vient d\'être pris.' }, 422);
    await expect(api.reserve(selection, 'x', adresse, { firstname: '', lastname: '', email: '', phone: '', notes: '' }, true))
      .rejects.toMatchObject({ message: 'Ce créneau vient d\'être pris.', status: 422 });
  });
});
