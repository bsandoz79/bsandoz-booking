/** Notifications push côté navigateur (service worker, PushManager et API simulés). */
const ABONNEMENT = { endpoint: 'https://push.example.test/1', keys: { p256dh: 'BCle', auth: 'auth' } };

let fetchMock: ReturnType<typeof vi.fn>;
let abonnementActuel: { endpoint: string; toJSON: () => unknown; unsubscribe: ReturnType<typeof vi.fn> } | null;
let subscribe: ReturnType<typeof vi.fn>;

async function charger({ cle = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U', permission = 'granted' as NotificationPermission } = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://api.exemple.test');
  abonnementActuel = null;
  const pushManager = {
    getSubscription: vi.fn(async () => abonnementActuel),
    subscribe: vi.fn(async () => {
      abonnementActuel = { endpoint: ABONNEMENT.endpoint, toJSON: () => ABONNEMENT, unsubscribe: vi.fn(async () => true) };
      return abonnementActuel;
    }),
  };
  subscribe = pushManager.subscribe;
  const enregistrement = { pushManager };
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(enregistrement), getRegistration: vi.fn(async () => enregistrement) } });
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn(async () => permission) });
  fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url.endsWith('/push/key')) return new Response(JSON.stringify({ publicKey: cle }));
    if (url.endsWith('/auth/login')) return new Response(JSON.stringify({ token: 'pro', roles: ['ROLE_PRO'] }));
    return new Response(null, { status: init.method ? 204 : 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  await (await import('./compte')).seConnecter('pro@example.org', 'x');
  return import('./push');
}

const appelsAdmin = () => (fetchMock.mock.calls as [string, RequestInit][])
  .filter(([url]) => url.endsWith('/admin/push'))
  .map(([, init]) => ({ method: init.method, body: JSON.parse(String(init.body)), auth: (init.headers as Record<string, string>).Authorization }));

describe('notifications push', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('convertit la clé VAPID base64url en octets', async () => {
    const { cleEnOctets } = await charger();
    expect(Array.from(cleEnOctets('AQID_-8'))).toEqual([1, 2, 3, 255, 239]);
  });

  it('active : autorisation, abonnement avec la clé du serveur, enregistrement côté API', async () => {
    const push = await charger();
    expect(await push.etatPush()).toBe('inactif');
    expect(await push.activerPush()).toBe('actif');
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(appelsAdmin()).toEqual([{ method: 'POST', body: ABONNEMENT, auth: 'Bearer pro' }]);
    expect(await push.etatPush()).toBe('actif');
  });

  it('désactive : désabonnement côté API et dans le navigateur', async () => {
    const push = await charger();
    await push.activerPush();
    const abonnement = abonnementActuel;
    expect(await push.desactiverPush()).toBe('inactif');
    expect(appelsAdmin().at(-1)).toMatchObject({ method: 'DELETE', body: { endpoint: ABONNEMENT.endpoint } });
    expect(abonnement?.unsubscribe).toHaveBeenCalled();
  });

  it('signale une autorisation refusée sans s’abonner', async () => {
    const push = await charger({ permission: 'denied' });
    expect(await push.activerPush()).toBe('refuse');
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('signale des notifications non configurées côté API', async () => {
    const push = await charger({ cle: '' });
    expect(await push.etatPush()).toBe('non-configure');
  });
});
