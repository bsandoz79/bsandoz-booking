import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Visionneuse } from './Visionneuse';

const photos = [
  { url: '/a.jpg', description: 'La salle' },
  { url: '/b.jpg', description: 'Le comptoir' },
  { url: '/c.jpg', description: 'La vitrine' },
];

function Essai({ depart = 0 }: { depart?: number | null }) {
  const [index, setIndex] = useState<number | null>(depart);
  return (
    <>
      <button type="button" onClick={() => setIndex(0)}>Ouvrir</button>
      <Visionneuse photos={photos} index={index} onChange={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}

describe('Visionneuse', () => {
  it('montre la photo en grand avec sa légende et sa position', () => {
    render(<Essai />);
    const fenetre = screen.getByRole('dialog', { name: 'Photo agrandie' });
    expect(screen.getByRole('img', { name: 'La salle' })).toHaveAttribute('src', '/a.jpg');
    expect(fenetre).toHaveTextContent('La salle · 1 / 3');
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveFocus();
  });

  it('passe d’une photo à l’autre par les flèches et le clavier, en boucle', () => {
    render(<Essai />);
    fireEvent.click(screen.getByRole('button', { name: 'Photo suivante' }));
    expect(screen.getByRole('img', { name: 'Le comptoir' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByRole('img', { name: 'La salle' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Photo précédente' }));
    expect(screen.getByRole('img', { name: 'La vitrine' })).toBeInTheDocument();
  });

  it('se ferme par la croix, Échap ou un clic sur le fond', () => {
    render(<Essai />);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('une seule photo : pas de flèches', () => {
    render(<Visionneuse photos={photos.slice(0, 1)} index={0} onChange={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /Photo/ })).not.toBeInTheDocument();
  });
});
