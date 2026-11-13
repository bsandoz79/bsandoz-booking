import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortableList } from './SortableList';

const ITEMS = [{ id: 'a', nom: 'Désodorisant' }, { id: 'b', nom: 'Poils' }, { id: 'c', nom: 'Très sale' }];
const afficher = (onReorder = vi.fn()) => {
  render(<SortableList items={ITEMS} getKey={(i) => i.id} label="Options" handleLabel={(i) => `Déplacer ${i.nom}`}
    movedMessage={(i, p, t) => `${i.nom} : position ${p} sur ${t}`} renderItem={(i) => <span>{i.nom}</span>} onReorder={onReorder} />);
  return onReorder;
};
const noms = () => screen.getAllByRole('listitem').map((li) => li.textContent);

describe('SortableList', () => {
  it('déplace au clavier depuis la poignée et annonce la nouvelle position', async () => {
    const onReorder = afficher();
    screen.getByRole('button', { name: 'Déplacer Désodorisant' }).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(noms()).toEqual(['Poils', 'Très sale', 'Désodorisant']);
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'c', 'a']);
    expect(screen.getByText('Désodorisant : position 3 sur 3')).toBeInTheDocument();
  });

  it('glisse à la souris : l’élément suit le pointeur, l’ordre est envoyé au lâcher', () => {
    const onReorder = afficher();
    const [a, , c] = screen.getAllByRole('listitem');
    const liste = screen.getByRole('list', { name: 'Options' });
    document.elementFromPoint = vi.fn(() => c);
    fireEvent.pointerDown(a, { button: 0, pointerType: 'mouse', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(liste, { pointerType: 'mouse', clientX: 10, clientY: 80 });
    expect(onReorder).not.toHaveBeenCalled();
    fireEvent.pointerUp(liste);
    expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
  });

  it('au doigt, un geste rapide fait défiler sans déplacer', () => {
    const onReorder = afficher();
    const [a, b] = screen.getAllByRole('listitem');
    const liste = screen.getByRole('list', { name: 'Options' });
    document.elementFromPoint = vi.fn(() => b);
    fireEvent.pointerDown(a, { button: 0, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(liste, { pointerType: 'touch', clientX: 10, clientY: 60 });
    fireEvent.pointerUp(liste);
    expect(onReorder).not.toHaveBeenCalled();
    expect(noms()).toEqual(['Désodorisant', 'Poils', 'Très sale']);
  });
});
