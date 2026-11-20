# Defilant

Bande d'éléments (avis, photos…) qui défile toute seule : `visibles` éléments à la fois (3 par défaut sur grand écran, 1 sur téléphone). À chaque pas (3 s par défaut), celui de gauche sort, les autres glissent d'un cran et un nouveau entre à droite, en boucle.

```tsx
<Defilant label="Avis des clients" visibles={3} intervalle={3000}>
  {avis.map((a) => <Avis key={a.id} {...a} />)}
</Defilant>
```

- Accessibilité : zone nommée (`aria-roledescription="carrousel"`), boutons Précédent, Pause / Reprendre et Suivant (44 px), pause au survol et quand un élément a le focus ; les copies servant à la boucle sont cachées aux lecteurs d'écran (`aria-hidden`, `inert`). Annonce des changements seulement en pause (`aria-live`).
- Appareil réglé sur « réduire les animations » : pas de défilement automatique ni d'animation, boutons toujours utilisables.
- Un seul élément à la fois (téléphone) : la bande prend la hauteur de l'élément affiché (suivie si elle change).
- Pas plus d'éléments que de places : simple liste, sans boutons, une colonne par élément.
- Props : `label`, `visibles`, `visiblesMobile`, `largeurMin` (720 px), `intervalle` (ms), `libelles`.
- Thème : `--bs-defilant-ecart` (espace entre éléments), `--bs-defilant-bouton` (couleur des boutons).
