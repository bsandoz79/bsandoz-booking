# Atelier Brillance – site (front)

Site React (Vite) du premier client, construit avec les blocs du kit `@bsandoz/ui`.

## Commandes
- `npm run lint`, `npm run test`, `npm run build` (ne jamais lancer `npm run dev` dans les scripts automatiques).

## Configuration
- `VITE_API_URL` : adresse de base de l'API, sans `/api/v1` (ex. `https://api.demo.bsandoz.fr`), dans `.env.local` (non versionné). Vide : le site utilise les données de démonstration de `src/data/demo.ts` et n'appelle pas l'API (la recherche d'adresse interroge alors directement la Base Adresse Nationale, le paiement est simulé).

## Branchement sur l'API (`src/services/api.ts`)
Contrat : `docs/api.md`. Le parcours envoie la prestation, la variante (type de véhicule ou `canape_<places>`), les options et les données métier (`metierData`) ; l'API recalcule le prix et la variante côté serveur. Les jours et créneaux tiennent compte de la prestation (durée incertaine → débuts de demi-journée). À la validation : redirection vers la page de paiement Stripe (`paymentUrl`), ou page de confirmation si aucun acompte n'est demandé. Créneau pris entre-temps (422) : retour au choix de l'heure avec le message de l'API. Paiement abandonné : Stripe renvoie sur `/reserver?paiement=annule`, un message l'indique.

## Contenu
- `src/data/site.ts` : marque, ville, zone, acompte, délai d'annulation et identité légale. Tout ce qui n'est pas connu reste `[à compléter]` : ne jamais inventer d'avis, de chiffres ni de coordonnées. Les valeurs de zone, d'acompte et d'annulation doivent rester identiques aux réglages de l'API.
- `src/data/demo.ts` : prestations et options de démonstration (identiques à `php bin/console detailing:demo:charger` côté API).

## Pages
- `/` : accueil (prestations, comment ça marche, réalisations avant / après à fournir, zone d'intervention, avis à compléter, questions fréquentes).
- `/reserver`, `/confirmation` : parcours de réservation.
- `/mon-espace` : espace client (connexion ; rendez-vous à venir et historique ; déplacer, annuler avec remboursement de l'acompte si l'annulation est gratuite ; télécharger ses données ; supprimer son compte ; déconnexion). La session est reprise au chargement grâce au cookie de renouvellement ; le jeton d'accès reste en mémoire (jamais dans le stockage du navigateur).
- Liens des e-mails (chemins utilisés par les modèles de mails du kit) : `/compte/activer?jeton=` (premier mot de passe), `/compte/mot-de-passe` (demande de lien, puis `?jeton=` pour le nouveau mot de passe), `/rendez-vous?jeton=` (gérer un rendez-vous sans compte).
- `/pro` : espace pro (compte avec le rôle pro, créé par `php bin/console bsandoz:pro:creer`) : tableau de bord, planning jour / semaine / mois avec le détail d'un rendez-vous (appeler, itinéraire, terminé, absent, annuler avec ou sans remboursement, rembourser), rendez-vous pris par téléphone (confirmé tout de suite ou lien d'acompte envoyé), catalogue (prestations avec tarif par type de véhicule ou nombre de places, durée incertaine, options), horaires de la semaine et congés, règles de réservation et zone d'intervention (ou activité sur place). Service : `src/services/pro.ts`. En mode démo, la connexion ouvre aussi l'espace pro.
- `/mentions-legales`, `/cgv`, `/confidentialite` : pages légales (`src/pages/Legal`) reprenant `site.ts` ; identité de l'entreprise, droit de rétractation, médiateur et durée de conservation `[à compléter]`, textes à faire relire avant la mise en ligne.
- Toute autre adresse : page introuvable.
