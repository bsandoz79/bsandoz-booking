import { changerTheme } from './theme';

describe('changerTheme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.rideau;
    Reflect.deleteProperty(document, 'startViewTransition');
  });

  it('ouvre un rideau dans le sens du thème choisi, puis le retire', async () => {
    let fin: () => void = () => undefined;
    const startViewTransition = vi.fn((maj: () => void) => {
      maj();
      return { finished: new Promise<void>((ok) => { fin = ok; }) };
    });
    Object.defineProperty(document, 'startViewTransition', { value: startViewTransition, configurable: true });
    const maj = vi.fn();

    changerTheme('nuit', maj);
    expect(document.documentElement.dataset.rideau).toBe('nuit');
    expect(document.documentElement.dataset.theme).toBe('nuit');
    expect(maj).toHaveBeenCalledOnce();

    fin();
    await Promise.resolve(); await Promise.resolve();
    expect(document.documentElement.dataset.rideau).toBeUndefined();
  });

  it('change tout de suite sans prise en charge du navigateur', () => {
    changerTheme('clair');
    expect(document.documentElement.dataset.theme).toBe('clair');
    expect(document.documentElement.dataset.rideau).toBeUndefined();
  });
});
