# Perfect Clean – site (front)

Site React (Vite) du premier client, construit avec les blocs du kit `@bsandoz/ui`.

## Commandes
- `npm run lint`, `npm run test`, `npm run build` (ne jamais lancer `npm run dev` dans les scripts automatiques).

## Configuration
- `VITE_API_URL` : adresse de base de l'API, sans `/api/v1` (ex. `https://api.demo.bsandoz.fr`), dans `.env.local` (non versionné). Vide : le site utilise les données de démonstration de `src/data/demo.ts` et n'appelle pas l'API (la recherche d'adresse interroge alors directement la Base Adresse Nationale, le paiement est simulé).

## Branchement sur l'API (`src/services/api.ts`)
Contrat : `docs/api.md`. Le parcours envoie la prestation, la variante (type de véhicule ou `canape_<places>`), les options et les données métier (`metierData`) ; l'API recalcule le prix et la variante côté serveur. Les jours et créneaux tiennent compte de la prestation (durée incertaine → débuts de demi-journée). À la validation : redirection vers la page de paiement Stripe (`paymentUrl`), ou page de confirmation si aucun acompte n'est demandé. Créneau pris entre-temps (422) : retour au choix de l'heure avec le message de l'API. Paiement abandonné : Stripe renvoie sur `/reserver?paiement=annule`, un message l'indique.

## Contenu
- `src/services/contenu.ts` : contenu modifiable par le pro dans l'espace pro, rubrique **Mon site** (coordonnées, haut de l'accueil, étapes, réalisations avec photos, avis, FAQ, communes desservies, informations légales). Stocké par l'API (`GET /site`, `PUT /admin/site`, photos `POST /admin/medias`) ; ce qui n'a jamais été modifié garde les textes par défaut de `CONTENU_PAR_DEFAUT`. Fourni aux pages par `ContenuProvider` / `useContenu()`.
- `src/data/site.ts` : informations fixes (marque, ville de départ, zone, acompte, délai d'annulation, hébergeur).
- `src/data/demo.ts` : catalogue de démonstration Perfect Clean (identique à `php bin/console detailing:demo:charger` côté API) : 4 catégories (`CATEGORIES` : intérieur, extérieur, rénovation des phares, soins à la carte), un prix unique par formule (`basePriceCents`) sauf si l'artisan définit des prix par type de véhicule (`tarifs`), options à 10 €.

## Pages
- `/` : accueil (prestations en onglets par catégorie : une carte par formule avec prix, durée, « Ce qui est compris » et bouton « Choisir » vers `/reserver?formule=<id>` qui présélectionne la formule ; options de la catégorie ; comment ça marche ; réalisations avant / après à fournir ; zone d'intervention avec une carte par tranche de frais de déplacement et la carte `CarteZone` (OpenStreetMap / Leaflet, chargée seulement à l'arrivée sur la section) : un cercle par tranche autour de la ville de départ (rayon = distance routière ÷ `roadFactor`), position demandée au navigateur à l'arrivée sur la carte, sinon adresse à saisir ; estimation par `GET /booking/zone/estimation` et tranche correspondante mise en avant ; horaires de la semaine lus sur l'API (`GET /booking/hours`), jour courant mis en avant ; exemple de carte de fidélité ; avis à compléter ; questions fréquentes). Mise en forme dans `src/data/vitrine.ts` : la liste « Ce qui est compris » est tirée de la description saisie dans le Catalogue, éléments séparés par des virgules (au moins 3, sinon la phrase est affichée telle quelle), « Durée : … » en fin de description devient la durée affichée.
- `/reserver`, `/confirmation` : parcours de réservation en 3 étapes repliables (`StepCard`) : « Que faut-il nettoyer ? » (catégorie, formule, options sous la formule choisie), « Où et quand ? » (adresse puis jour et heure), « Vos coordonnées » (contact, précisions, CGV, paiement de l'acompte). Une étape terminée se replie en un résumé avec « Modifier ». Le total et le bouton principal restent collés en bas de l'écran. Aucun véhicule n'est demandé : prix de base de la formule (le client peut préciser son véhicule dans « Précisions »).
- `/mon-espace` : espace client (connexion ; rendez-vous à venir et historique ; déplacer, annuler avec remboursement de l'acompte si l'annulation est gratuite ; télécharger ses données ; supprimer son compte ; déconnexion). La session est reprise au chargement grâce au cookie de renouvellement ; le jeton d'accès reste en mémoire (jamais dans le stockage du navigateur).
- Liens des e-mails (chemins utilisés par les modèles de mails du kit) : `/compte/activer?jeton=` (premier mot de passe), `/compte/mot-de-passe` (demande de lien, puis `?jeton=` pour le nouveau mot de passe), `/rendez-vous?jeton=` (gérer un rendez-vous sans compte).
- `/pro` : espace pro (compte avec le rôle pro, créé par `php bin/console bsandoz:pro:creer`) : tableau de bord, planning jour / semaine / mois avec le détail d'un rendez-vous (appeler, itinéraire, terminé, absent, annuler avec ou sans remboursement, rembourser), rendez-vous pris par téléphone (confirmé tout de suite ou lien d'acompte envoyé), catalogue (prestations avec tarif par type de véhicule ou nombre de places, durée incertaine, options), horaires de la semaine et congés, règles de réservation et zone d'intervention (ou activité sur place). Service : `src/services/pro.ts`. En mode démo, la connexion ouvre aussi l'espace pro.
- `/mentions-legales`, `/cgv`, `/confidentialite` : pages légales (`src/pages/Legal`) reprenant `site.ts` ; identité de l'entreprise, droit de rétractation, médiateur et durée de conservation `[à compléter]`, textes à faire relire avant la mise en ligne.
- Toute autre adresse : page introuvable.

## Version claire / nuit
- Bouton ☾ / ☀ dans le bandeau (`src/app/theme.ts`) : choix enregistré dans le navigateur ; sans choix, suit le réglage de l'appareil. Le script de `index.html` pose `data-theme` avant l'affichage (pas de flash).
- Couleurs dans `src/styles/theme.css` : `:root` (clair) et `:root[data-theme='nuit']`, qui surchargent les variables `--bs-*` du kit et `--brand-*`. Aucune couleur en dur dans les composants (sauf texte blanc sur bouton et carte de fidélité, papier dans les deux versions).

## Application installable (PWA)
- `public/manifest.webmanifest` (nom, couleurs, icônes `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, raccourcis Réserver / Mon espace / Espace pro), `apple-touch-icon.png` pour iOS. Icônes, `favicon.png`, `logo.png` (bandeau) et `partage.png` (image de partage 1200×630) générés depuis le logo Perfect Clean (`docs/marque/logo-perfect-clean.png`).
- `public/sw.js`, enregistré en production seulement (`src/pwa/serviceWorker.ts`) : pages en réseau d'abord avec repli hors connexion (`offline.html`), fichiers du build en cache, API jamais mise en cache. Changer `VERSION` dans `sw.js` vide les anciens caches.
- `public/.htaccess` : `sw.js` et le manifest servis sans cache navigateur.
- Notifications push du pro : rubrique Réglages de l'espace pro → « Activer les notifications » sur chaque appareil (`src/services/push.ts`). Nécessite les clés VAPID côté API ; sur iPhone, le site doit d'abord être ajouté à l'écran d'accueil (iOS 16.4 ou plus). Le service worker affiche la notification et ouvre l'espace pro au toucher.

## Carte de fidélité (`src/services/fidelite.ts`)
- Composant `CarteFidelite` : carte en carton (couleurs `--brand-paper`), une case par prestation tamponnée du logo (`public/tampon.png`, généré depuis le logo), case « −20 % » dorée quand la remise est disponible ; le dernier tampon arrive avec une animation (coupée si `prefers-reduced-motion`).
- Accueil : présentation de la règle (ex. 4 prestations, 20 % sur la suivante) avec un exemple de carte, masquée si la fidélité est désactivée.
- Espace client : carte tamponnée et message (« Encore 2 prestations avant 20 % de remise »).
- Espace pro : dans le détail d'un rendez-vous, carte du client avec « Ajouter / Retirer un tampon » ; règle dans Réglages → Carte de fidélité. Le tampon automatique et la remise sont gérés par l'API.

## Référencement local (Abbeville)
- `src/seo/donnees.ts` (sans import, lu aussi au build) : communes desservies, entreprise, prestations mises en avant, titres et descriptions de chaque page, données structurées schema.org (`AutoWash` : adresse, zone, horaires, prix).
- Une page par commune : `/nettoyage-voiture/<commune>` (Abbeville, Saint-Valery-sur-Somme, Le Crotoy, Rue…), liées depuis l'accueil et entre elles.
- `npm run build` lance ensuite `scripts/prerender.ts` : une page HTML par route publique (`dist/<chemin>.html`, servie par le `.htaccess`) avec titre, description, adresse canonique, Open Graph, données structurées et un contenu lisible sans JavaScript ; plus `sitemap.xml` et `robots.txt` (espaces client et pro exclus). Adresse du site : `VITE_SITE_URL` (variable GitHub, par défaut `https://demo.bsandoz.fr`).
- `useSeo()` met à jour titre et description pendant la navigation.
- À faire hors du code (le plus important pour Google Maps et « près de moi ») : créer la fiche **Google Business Profile** (catégorie « Service de nettoyage automobile », zone desservie, mêmes horaires, téléphone et lien vers le site), y demander des avis aux clients ; déclarer le site dans **Google Search Console** et y envoyer `sitemap.xml` ; garder partout le même nom, la même ville et le même téléphone.
