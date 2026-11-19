# Carte

Carte d'un commerce (restaurant, snack, boutique…) façon menu dessiné : pas de panneaux, pictogramme facultatif et trait ondulé sous chaque titre de rubrique, articles avec nom, description, photo et prix reliés par des points.
- `prixBarreCents` : ancien prix barré à côté du nouveau (l'API du module `Carte` le donne pendant le mois qui suit un changement).
- `nouveau`, `epuise` : pastilles ; un article épuisé est barré et n'est pas mis en avant.
- `note` : précision sous une rubrique (ex. un supplément).
- `pictogramme` (par rubrique, facultatif) : adresse d'une image d'un seul ton (SVG au trait), teintée par `--bs-carte-trait`.
- `compacte` : carte serrée, 4 colonnes dès 1000 px, pour la voir en entier sans défiler ; le sommaire y est caché sur grand écran.
- `sommaire` (facultatif) : nom de la navigation ; s'il est donné, les rubriques sont listées en pastilles cliquables en haut (défilement de côté sur téléphone, sur plusieurs lignes au-delà de 720 px).
- Une colonne sur téléphone, deux à partir de 720 px, trois à partir de 1100 px.

```tsx
<Carte titre="Notre carte" rubriques={carte} sommaire="Aller à une rubrique" />
```

## Thème
Variables facultatives (sinon le thème du kit) : `--bs-carte-fond`, `--bs-carte-panneau`, `--bs-carte-bord`, `--bs-carte-titre`, `--bs-carte-texte`, `--bs-carte-texte-doux`, `--bs-carte-prix`, `--bs-carte-accent`, `--bs-carte-accent-texte`, `--bs-carte-trait` (trait ondulé et pictogrammes, couleur d'accent par défaut), `--bs-carte-sommaire-fond` (pastilles du sommaire), `--bs-carte-police-titre`. Panneau et fond transparents par défaut.

## Accessibilité
Chaque rubrique est une région nommée ; l'ancien prix est annoncé « Ancien prix : … Nouveau prix : … » ; les points de conduite sont décoratifs.
