# Site de Croc's (démo)

Site d'une page pour Croc's (restauration rapide, 220 rue de Rouen, Amiens) : accueil (appeler, itinéraire), carte en code (bloc `Carte` du kit), venir (adresse, Google Maps, Waze, Plans, horaires, temps de trajet), avis, photos.

**Démo privée** tant que le patron n'a pas accepté : bandeau « Maquette proposée par Baptiste Sandoz », `noindex`. Prix et horaires relevés sur des sources publiques (voir `docs/crocs/carte-releve.md`), à faire valider. Photos de Google Maps en miniature : sur le serveur et en local seulement (`public/photos/`, ignoré par Git, ce dépôt étant public) ; à remplacer par ses photos, avec son accord.

- Données : `src/data/crocs.ts` (coordonnées, horaires, avis, carte intégrée).
- **Modifiable par le patron** : avec `VITE_API_URL` (`.env.production` : `https://api.crocs.demo.bsandoz.fr`), le site lit la carte (`/carte`) et les textes (`/site` : annonce en haut du site, phrase d'accueil, horaires) sur l'API `apps/crocs/api`. Si l'API ne répond pas, il garde la carte intégrée.
- **Espace du patron** : `/pro` (connexion), quatre onglets :
  - « La carte » (bloc `EditeurCarte`) : prix changé, l'ancien barré un mois au choix ; plat ajouté : « Nouveau » un mois ; « Épuisé » jusqu'à minuit ;
  - « Infos du site » : annonce, phrase d'accueil, horaires ;
  - « Avis » : avis recopiés par le patron (nom, note, texte, quand, où publié), ordre, retrait en deux touches ;
  - « Photos » : photo prise au téléphone, réduite dans le navigateur (1600 px, JPEG) puis envoyée à l'API (`/admin/medias`), avec sa description (texte alternatif) ; ordre, retrait (le fichier est supprimé aussi).
  Avis et photos sont rangés dans le contenu du site (`/site` : `avis`, `photos`) ; absents, le site garde ceux de départ. Sur le site, ils sont dans un bloc `Defilant` : 3 à la fois, ils défilent au-delà.
- Temps de trajet : `src/calculs/trajet.ts` (distance à vol d'oiseau × 1,35, vitesses moyennes en ville : voiture 22 km/h + 2 min pour se garer, vélo 14 km/h, pied 4,8 km/h). Calculé dans le navigateur : la position ne quitte pas l'appareil ; une adresse tapée est cherchée dans la Base Adresse Nationale (api-adresse.data.gouv.fr).

```sh
npm install
npm run lint && npm run test && npm run build
```

## Mise en ligne (crocs.demo.bsandoz.fr)

Démo montrée au patron avec son accord. **Envoi automatique** par GitHub (job `crocs-front` de `.github/workflows/deploy.yml`) après une CI verte sur `main`, ou Actions → Déploiement → « crocs ». Secret de l'environnement `demo` : `FTP_SERVER_DIR_CROCS_FRONT` = `crocs.demo.bsandoz.fr/`. Le `.htaccess` (HTTPS obligatoire, `X-Robots-Tag: noindex`, `/pro`) fait partie du build.

**Photos** : jamais dans ce dépôt public. Le site les lit dans le dossier `photos/` du serveur (`/photos/assiette.webp`, `salle.webp`, `comptoir.webp`) ; l'envoi ne touche jamais à ce dossier. En local : `public/photos/` (ignoré par Git). Pour en changer une : la déposer dans `crocs.demo.bsandoz.fr/photos/` (gestionnaire de fichiers cPanel), même nom.
