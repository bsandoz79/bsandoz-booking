# Site de Croc's (démo)

Site d'une page pour Croc's (restauration rapide, 220 rue de Rouen, Amiens) : accueil (appeler, itinéraire), carte en code (bloc `Carte` du kit), venir (adresse, Google Maps, Waze, Plans, horaires, temps de trajet), avis, photos.

**Démo** tant que le patron n'a pas accepté : `noindex` (balise et `.htaccess`). Plus de bandeau « maquette ». Pied de page : lien vers les mentions légales et petite mention « Site créé par Baptiste Sandoz » vers bsandoz.fr.

**Mentions légales** : `/mentions-legales` (`src/data/legal.ts`) : éditeur, hébergeur (o2switch), réalisation, données personnelles (aucun cookie de suivi ni mesure d'audience : pas de bandeau de consentement), avis et photos. Éditeur et adresse de l'hébergeur d'après l'annuaire des entreprises (éditeur à faire confirmer par le patron). Prix et horaires relevés sur des sources publiques (voir `docs/crocs/carte-releve.md`), à faire valider. Photos de Google Maps en miniature : sur le serveur et en local seulement (`public/photos/`, ignoré par Git, ce dépôt étant public) ; à remplacer par ses photos, avec son accord.

- Données : `src/data/crocs.ts` (coordonnées, horaires, avis, carte intégrée).
- **Modifiable par le patron** : avec `VITE_API_URL` (`.env.production` : `https://api.crocs.demo.bsandoz.fr`), le site lit la carte (`/carte`) et les textes (`/site` : annonce en haut du site, phrase d'accueil, horaires) sur l'API `apps/crocs/api`. Pas de clignotement : le dernier contenu reçu est gardé sur l'appareil (`localStorage`, clé `crocs-contenu-v1`) et affiché tout de suite ; à la première visite, la carte, les horaires et les avis attendent l'API. Si elle ne répond pas en 2,5 s, il garde la carte intégrée.
- **Espace du patron** : `/pro` (connexion ; lien discret « Espace pro » en pied de page). S'installe comme une appli sur le téléphone (`public/pro.webmanifest`, icônes `public/pro-icones/`, manifeste ajouté seulement sur `/pro`) : bouton « Mettre sur mon téléphone » (Android) ou explication (iPhone : Partager → Sur l'écran d'accueil). Déconnexion après 30 minutes sans activité, y compris quand l'appli est rouverte plus tard (dernière activité gardée sur l'appareil). Quatre onglets :
  - « La carte » (bloc `EditeurCarte`) : prix changé, l'ancien barré un mois au choix ; plat ajouté : « Nouveau » un mois ; « Épuisé » jusqu'à minuit ;
  - « Infos du site » : annonce, phrase d'accueil, horaires ;
  - « Avis » : avis recopiés par le patron (nom, note, texte, quand, où publié), ordre, retrait en deux touches ;
  - « Photos » (7 au plus, en diaporama en haut du site après la photo principale) : photo prise au téléphone, réduite dans le navigateur (1600 px, JPEG) puis envoyée à l'API (`/admin/medias`), avec sa description (texte alternatif) ; ordre, retrait (le fichier est supprimé aussi).
  Avis et photos sont rangés dans le contenu du site (`/site` : `avis`, `photos`) ; absents, le site garde ceux de départ. Sur le site, ils sont dans un bloc `Defilant` : 3 à la fois, ils défilent au-delà.
- Temps de trajet : `src/calculs/trajet.ts` (distance à vol d'oiseau × 1,35, vitesses moyennes en ville : voiture 22 km/h + 2 min pour se garer, vélo 14 km/h, pied 4,8 km/h). Calculé dans le navigateur : la position ne quitte pas l'appareil ; une adresse tapée est cherchée dans la Base Adresse Nationale (api-adresse.data.gouv.fr).

```sh
npm install
npm run lint && npm run test && npm run build
```

## Mise en ligne (crocs.demo.bsandoz.fr)

Démo montrée au patron avec son accord. **Envoi automatique** par GitHub (job `crocs-front` de `.github/workflows/deploy.yml`) après une CI verte sur `main`, ou Actions → Déploiement → « crocs ». Secret de l'environnement `demo` : `FTP_SERVER_DIR_CROCS_FRONT` = `crocs.demo.bsandoz.fr/`. Le `.htaccess` (HTTPS obligatoire, `X-Robots-Tag: noindex`, `/pro`) fait partie du build.

**Logo** : `photos/logo-crocs.webp` sur le serveur (lettres jaunes sur fond transparent, découpées du logo fourni), comme les photos ; composant `Logo` (en-tête, titre, pied de page), texte « Croc’s » si le fichier manque.

**Photos** : jamais dans ce dépôt public. Le site les lit dans le dossier `photos/` du serveur (`/photos/assiette.webp`, `salle.webp`, `comptoir.webp`) ; l'envoi ne touche jamais à ce dossier. En local : `public/photos/` (ignoré par Git). Pour en changer une : la déposer dans `crocs.demo.bsandoz.fr/photos/` (gestionnaire de fichiers cPanel), même nom.
