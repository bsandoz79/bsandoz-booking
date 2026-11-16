import { render, screen, within } from '@testing-library/react';
import { SCENE_INTERIEUR, imageCourante } from '../../data/sceneInterieur';
import { SceneInterieur } from './SceneInterieur';

describe('imageCourante', () => {
  it('donne l’image à l’écran selon l’avancement du défilement', () => {
    expect(imageCourante(0, 4)).toBe(0);
    expect(imageCourante(0.34, 4)).toBe(1);
    expect(imageCourante(0.67, 4)).toBe(2);
    expect(imageCourante(1, 4)).toBe(3);
    expect(imageCourante(-1, 4)).toBe(0);
    expect(imageCourante(2, 4)).toBe(3);
  });
});

describe('SceneInterieur', () => {
  it('épingle la scène et met les quatre images côte à côte, avec un titre et un texte de remplacement chacune', () => {
    const { container } = render(<SceneInterieur />);
    expect(screen.getByRole('heading', { level: 2, name: SCENE_INTERIEUR.titre })).toBeInTheDocument();
    const images = screen.getAllByRole('img');
    expect(images.map((i) => i.getAttribute('src'))).toEqual(SCENE_INTERIEUR.images.map((i) => i.src));
    for (const [i, image] of SCENE_INTERIEUR.images.entries()) expect(images[i]).toHaveAccessibleName(image.alt);
    // Section haute de plusieurs écrans : c'est le défilement qui fait glisser la piste.
    const section = container.querySelector('section') as HTMLElement;
    expect(section.style.getPropertyValue('--ecrans')).toBe(String(SCENE_INTERIEUR.ecrans));
    expect(section.style.getPropertyValue('--nombre')).toBe('4');
  });

  it('en mode modification : une simple rangée d’images, avec leur titre lisible', () => {
    render(<SceneInterieur statique />);
    const liste = screen.getByRole('list');
    expect(within(liste).getAllByRole('listitem')).toHaveLength(4);
    expect(liste).toHaveTextContent('Avant.');
    expect(liste).toHaveTextContent('Après.');
  });
});
