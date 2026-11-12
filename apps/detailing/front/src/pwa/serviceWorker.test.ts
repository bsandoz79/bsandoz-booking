import { enregistrerServiceWorker } from './serviceWorker';

describe('enregistrement du service worker', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('enregistre /sw.js en production', async () => {
    const register = vi.fn(async () => ({ scope: '/' }));
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    expect(await enregistrerServiceWorker(true)).toEqual({ scope: '/' });
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('ne fait rien en développement ni sans prise en charge, et ignore un échec', async () => {
    const register = vi.fn(async () => { throw new Error('refusé'); });
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    expect(await enregistrerServiceWorker(false)).toBeNull();
    expect(register).not.toHaveBeenCalled();
    expect(await enregistrerServiceWorker(true)).toBeNull();
    vi.stubGlobal('navigator', {});
    expect(await enregistrerServiceWorker(true)).toBeNull();
  });
});
