# Carte

Carte d'un commerce (restaurant, snack, boutique…) : rubriques en panneaux, articles avec nom, description, photo et prix reliés par des points.
- `prixBarreCents` : ancien prix barré à côté du nouveau (l'API du module `Carte` le donne pendant le mois qui suit un changement).
- `nouveau`, `epuise` : pastilles ; un article épuisé est barré et n'est pas mis en avant.
- `note` : précision sous une rubrique (ex. un supplément).
- Une colonne sur téléphone, deux à partir de 720 px, trois à partir de 1100 px.

```tsx
<Carte titre="Notre carte" rubriques={carte} />
```

## Thème
Variables facultatives (sinon le thème du kit) : `--bs-carte-fond`, `--bs-carte-panneau`, `--bs-carte-bord`, `--bs-carte-titre`, `--bs-carte-texte`, `--bs-carte-texte-doux`, `--bs-carte-prix`, `--bs-carte-accent`, `--bs-carte-accent-texte`, `--bs-carte-police-titre`.

## Accessibilité
Chaque rubrique est une région nommée ; l'ancien prix est annoncé « Ancien prix : … Nouveau prix : … » ; les points de conduite sont décoratifs.
