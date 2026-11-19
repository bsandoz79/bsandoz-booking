# EditeurCarte

Espace pro : la carte d'un commerce, modifiable au téléphone (pendant du bloc `Carte`, qui l'affiche aux visiteurs).
- Article : le toucher ouvre sa fiche (nom, prix, description, rubrique, affiché ou caché, supprimer en deux touches) ; « Épuisé » en une touche (bouton à bascule) ; ordre par glisser (appui long au doigt, flèches au clavier).
- Rubrique : nom, note (« Avec frites : + 1 € »), pictogramme choisi parmi `icones`, ordre par ↑ ↓, suppression (refusée par l'API si elle n'est pas vide : le message reçu est affiché).
- Prix saisis en euros (« 7,50 », « 7.5 », « 7 € ») et envoyés en centimes (`lirePrix`).

Le bloc n'appelle aucune API : chaque action passe par une fonction (`onAjouterArticle`, `onModifierArticle`, `onEpuiser`, `onSupprimerArticle`, `onOrdonnerArticles`, `onAjouterRubrique`, `onModifierRubrique`, `onSupprimerRubrique`, `onOrdonnerRubriques`) qui renvoie une promesse ; une erreur levée affiche son message. Après chaque action, l'application recharge la carte et la redonne en `rubriques`.

```tsx
<EditeurCarte
  rubriques={carte}
  icones={[{ cle: 'burger', nom: 'Burger', url: burgerSvg }]}
  onEpuiser={(id, epuise) => api.put(`/admin/carte/articles/${id}/epuise`, { epuise }).then(recharger)}
  …
  libelles={{ ajouterArticle: 'Ajouter un plat' }}
/>
```

## Thème
Thème du kit (`--bs-*`) ; pictogrammes teintés par `--bs-carte-trait` (sinon `--bs-color-primary`).

## Accessibilité
Fiches en fenêtre modale (focus gardé, Échap) ; « Épuisé » annoncé avec son état (`aria-pressed`) ; boutons ↑ ↓ nommés avec la rubrique ; erreurs annoncées (`role="alert"`).
