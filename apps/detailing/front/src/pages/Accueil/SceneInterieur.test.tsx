import { render, screen } from '@testing-library/react';
import { SCENE_INTERIEUR, cadrageCouvrant, etatScene, partPropre, pointDuTrajet, rayonPassage, trajetVitre } from '../../data/sceneInterieur';
import { SceneInterieur } from './SceneInterieur';

const { moments, zoom } = SCENE_INTERIEUR;

describe('etatScene', () => {
  it('approche : la portière sale grossit vers l’ouverture, puis laisse place à l’habitacle sale', () => {
    const debut = etatScene(0);
    expect(debut).toMatchObject({ propre: false, titre: 'approche', porte: { opacite: 1, echelle: 1 }, habitacle: { opacite: 0 } });
    const entree = etatScene(moments.entree[1]);
    expect(entree.propre).toBe(false);
    expect(entree.porte).toEqual({ opacite: 0, echelle: zoom });
    expect(entree.habitacle).toEqual({ opacite: 1, echelle: 1 });
    expect(entree.titre).toBe('arret');
  });

  it('après l’arrêt, tout est propre : l’habitacle propre laisse place à la portière propre, qui recule', () => {
    // Au point d'arrêt, encore sale : c'est le chiffon qui nettoie.
    expect(etatScene(moments.arret)).toMatchObject({ propre: false, habitacle: { opacite: 1 }, porte: { opacite: 0 } });
    expect(etatScene(moments.arret + 0.001).propre).toBe(true);
    const fin = etatScene(1);
    expect(fin).toMatchObject({ propre: true, titre: 'sortie', porte: { opacite: 1, echelle: 1 }, habitacle: { opacite: 0 } });
  });

  it('remonter rejoue le chemin à l’envers, sale de nouveau', () => {
    expect(etatScene(moments.arret - 0.01).propre).toBe(false);
    expect(etatScene(0.2)).toEqual(etatScene(0.2));
  });
});

describe('trajet du chiffon, comme sur une vitre', () => {
  it('fait 3 passages : gauche → droite, droite → gauche, gauche → droite, du haut vers le bas', () => {
    expect(trajetVitre(1000, 300, 3)).toEqual([
      { x: 0, y: 50 }, { x: 1000, y: 50 },
      { x: 1000, y: 150 }, { x: 0, y: 150 },
      { x: 0, y: 250 }, { x: 1000, y: 250 },
    ]);
    // Le grand chiffon couvre sa bande entière.
    expect(2 * rayonPassage(300, 3)).toBeGreaterThan(100);
  });

  it('mesure la part nettoyée du masque', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 200]);
    expect(partPropre(pixels)).toBe(0.75);
    expect(partPropre(new Uint8ClampedArray())).toBe(0);
  });

  it('avance le long du trajet', () => {
    const trajet = trajetVitre(1000, 400, 3);
    expect(pointDuTrajet(trajet, 0)).toEqual(trajet[0]);
    expect(pointDuTrajet(trajet, 1)).toEqual(trajet[trajet.length - 1]);
    const milieuPremiere = pointDuTrajet([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0.5);
    expect(milieuPremiere).toEqual({ x: 50, y: 0 });
  });
});

describe('cadrageCouvrant', () => {
  it('cadre l’image comme « object-fit: cover »', () => {
    expect(cadrageCouvrant(1920, 1072, 960, 1072)).toEqual({ x: -480, y: 0, largeur: 1920, hauteur: 1072 });
  });
});

describe('SceneInterieur', () => {
  it('épingle la scène : portière sale et habitacle sale, avec leur texte de remplacement', () => {
    const { container } = render(<SceneInterieur />);
    expect(screen.getByRole('heading', { level: 2, name: SCENE_INTERIEUR.titre })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: SCENE_INTERIEUR.images.porteSale.alt })).toBeInTheDocument();
    expect(container.querySelector(`img[src="${SCENE_INTERIEUR.images.habitacleSale.src}"]`)).not.toBeNull();
    expect((container.querySelector('section') as HTMLElement).style.getPropertyValue('--ecrans')).toBe(String(SCENE_INTERIEUR.ecrans));
    // Pas de consigne tant qu'on n'est pas arrivé dans l'habitacle.
    expect(screen.queryByRole('button', { name: /Passer/ })).not.toBeInTheDocument();
  });

  it('se joue aussi avec « moins d’animations » : même scène, sans zoom', () => {
    const avant = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    const { container } = render(<SceneInterieur />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    const porte = screen.getByRole('img', { name: SCENE_INTERIEUR.images.porteSale.alt });
    expect(porte.style.transform).toBe('');
    expect(container.querySelector('canvas')).not.toBeNull();
    window.matchMedia = avant;
  });
});
