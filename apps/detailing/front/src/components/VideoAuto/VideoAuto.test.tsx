import { act, render } from '@testing-library/react';
import { VideoAuto } from './VideoAuto';

let rappel: (entrees: Partial<IntersectionObserverEntry>[]) => void = () => undefined;
class FauxObservateur {
  constructor(f: typeof rappel) { rappel = f; }
  observe() {}
  disconnect() {}
}

describe('VideoAuto', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('se lance à l’écran et se met en pause quand elle en sort, sans son et en boucle', () => {
    vi.stubGlobal('IntersectionObserver', FauxObservateur);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { container } = render(<VideoAuto src="/v.mp4" affiche="/a.jpg" libelle="Vidéo" largeur={1920} hauteur={1080} />);
    const video = container.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute('preload', 'none');

    act(() => { rappel([{ isIntersecting: true }]); });
    expect(play).toHaveBeenCalled();
    act(() => { rappel([{ isIntersecting: false }]); });
    expect(pause).toHaveBeenCalled();
  });
});
