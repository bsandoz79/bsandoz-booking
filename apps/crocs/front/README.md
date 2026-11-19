# Site de Croc's (démo)

Site d'une page pour Croc's (restauration rapide, 220 rue de Rouen, Amiens) : accueil (appeler, itinéraire), carte en code (bloc `Carte` du kit), venir (adresse, Google Maps, Waze, Plans, horaires, temps de trajet), avis, photos.

**Démo privée** tant que le patron n'a pas accepté : bandeau « Maquette proposée par Baptiste Sandoz », `noindex`. Prix et horaires relevés sur des sources publiques (voir `docs/crocs/carte-releve.md`), à faire valider. Photos de Google Maps en miniature : seulement en local (`src/assets/`, ignoré par Git, ce dépôt étant public) ; à remplacer par ses photos, avec son accord.

- Données : `src/data/crocs.ts` (coordonnées, horaires, avis, carte intégrée).
- **Modifiable par le patron** : avec `VITE_API_URL` (`.env.production` : `https://api.crocs.demo.bsandoz.fr`), le site lit la carte (`/carte`) et les textes (`/site` : annonce en haut du site, phrase d'accueil, horaires) sur l'API `apps/crocs/api`. Si l'API ne répond pas, il garde la carte intégrée.
- **Espace du patron** : `/pro` (connexion, onglets « La carte » avec le bloc `EditeurCarte` et « Infos du site »). Prix changé : l'ancien reste barré un mois ; plat ajouté : « Nouveau » un mois ; « Épuisé » jusqu'à minuit.
- Temps de trajet : `src/calculs/trajet.ts` (distance à vol d'oiseau × 1,35, vitesses moyennes en ville : voiture 22 km/h + 2 min pour se garer, vélo 14 km/h, pied 4,8 km/h). Calculé dans le navigateur : la position ne quitte pas l'appareil ; une adresse tapée est cherchée dans la Base Adresse Nationale (api-adresse.data.gouv.fr).

```sh
npm install
npm run lint && npm run test && npm run build
```

## Mise en ligne (crocs.demo.bsandoz.fr)

Démo montrée au patron avec son accord. Les photos n'étant pas dans le dépôt public, la CI ne peut pas construire le site complet : il est envoyé à la main.

1. Construire : `npm run build` (avec les photos dans `src/assets/`).
2. Compresser le contenu de `dist/` (dont `.htaccess` : HTTPS obligatoire, `X-Robots-Tag: noindex`).
3. cPanel → Gestionnaire de fichiers → dossier `crocs.demo.bsandoz.fr` → Charger le zip → Extraire (les fichiers à la racine du dossier).
