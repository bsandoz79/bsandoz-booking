# SortableList

Liste (ou grille) réordonnable : glisser à la souris, appui long puis glisser au doigt, flèches au clavier depuis la poignée.

```tsx
<SortableList items={options} getKey={(o) => o.id} label="Options" handleLabel={(o) => `Déplacer ${o.name}`}
  renderItem={(o) => <OptionLigne option={o} />} onReorder={(ids) => enregistrerOrdre(ids)} />
```

- `layout="grid"` : cartes en grille, poignée en haut à droite de chaque carte.
- `movedMessage` : annonce lue après un déplacement au clavier (« Microfibre : position 3 sur 5 »).
- Les boutons, liens et champs placés dans un élément gardent leur comportement.
- `getItemLabel` : nom de chaque élément (ex. le nom du produit), lu par les lecteurs d'écran.
