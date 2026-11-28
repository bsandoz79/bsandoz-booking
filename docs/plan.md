# Plan de développement

Une case = une branche. Commits « un ajout = un commit », tests et docs à jour, push, fusion dans `main`, case cochée.

## 0. Socle
- [x] `chore/structure` : monorepo, règles, documentation, squelette des modules (méthodes `@todo`), logique de prix / zone / créneaux implémentée
- [x] `chore/installation` : `composer install` dans `packages/core` et `apps/detailing/api` (Symfony 7.4 LTS), `npm install` dans `packages/ui` et `apps/detailing/front`, toute la CI verte

## 1. Kit back
- [x] `feature/core-shared` : tests de `Money`, `TimeRange` et `Clock`, horloge figée `FrozenClock`
- [x] `feature/core-catalog` : mapping Doctrine XML, repositories, `ListerCatalogue`, `CalculerDevis`, contrôleur, erreurs problem+json, bundle câblé, migration, tests (unitaires, SQLite, fonctionnels)
- [x] `feature/core-booking-domain` : tests complets de `CreneauCalculator` et `ZoneCalculator`, invariants des règles / horaires / zone, créneaux sans doublon
- [x] `feature/core-booking-demi-journee` : prestations à durée incertaine (`occupePlage`) : seulement en début de demi-journée libre, qui est alors bloquée jusqu'à la fermeture
- [x] `feature/core-zone-facultative` : zone facultative (activité sur place, ex. barbier : ni trajet ni frais, rendez-vous enchaînés avec tampon 0)
- [x] `feature/core-booking-creneaux` : horaires et indisponibilités (persistance), `ListerJoursDisponibles`, `ListerCreneaux`, routes `/booking/days` et `/booking/slots`, occupations = réservations bloquantes étendues de leur propre trajet, tests
- [x] `feature/core-booking-reservation` : verrou d'agenda, `ReserverCreneau` (blocage 10 min), `AnnulerReservation`, `DeplacerReservation`, contrôleurs, tests
- [x] `feature/core-geocoding` : adaptateur api-adresse.data.gouv.fr (gratuit) + cache
- [x] `feature/core-auth-jetons` : jetons à usage unique, activation par lien, mot de passe oublié, lien « gérer mon rendez-vous » (voir / annuler / déplacer sans compte), limitation des tentatives (réservation, mot de passe oublié, gestion)
- [x] `feature/core-auth-session` : JWT + refresh token en cookie httpOnly, espace client (`/me`, mes réservations, annuler / déplacer), voters, export et suppression du compte (RGPD)
- [x] `feature/core-securite-donnees` : chiffrement de l'adresse et du téléphone en base (clé propre au client)
- [x] `feature/core-payment` : Stripe Checkout (`paymentUrl` de `POST /booking/reservations`), webhook signé et idempotent, remboursement
- [x] `feature/core-notification` : mails Twig (remplace le notifier de journal utilisé en attendant), .ics, flux iCal, commande cron des rappels
- [x] `feature/core-admin` : CRUD prestations, options, tarifs, horaires, indisponibilités, règles, zone, paramètres ; tableau de bord

## 2. Kit front
- [x] `feature/ui-calendar` : Calendar et SlotPicker écrits et testés (navigation clavier ajoutée dans `feature/ui-blocks`)
- [x] `feature/ui-blocks` : OptionCard, ChoiceChips, PriceSummary, Stepper ; Button, Field, AddressInput (autocomplétion) ; navigation clavier du calendrier
- [x] `feature/ui-admin-blocks` : PlanningView (jour/semaine/mois), DataTable, Toggle

## 3. Application detailing
- [x] `feature/detailing-metier` : `VehiculeType`, `Vehicule` (marque/modèle → type), `DetailingVarianteResolver`, données de démo en base (commande de chargement : prestations, options, horaires ; choix des formules à durée incertaine)
- [x] `feature/detailing-site` : accueil (première version écrite) à enrichir : réalisations avant/après, zone, avis `[à compléter]`, pages légales
- [x] `feature/detailing-reservation` : parcours en étapes déjà écrit avec données de démo → le brancher sur l'API réelle, compléter les tests (adresse, créneau, coordonnées, paiement)
- [x] `feature/detailing-espace-client` : rendez-vous, annulation/déplacement, compte, mot de passe par lien, suppression
- [x] `feature/detailing-espace-pro` : planning, rendez-vous pris par téléphone + lien d'acompte, catalogue, horaires, zone
- [x] `feature/detailing-pwa` : manifest, service worker, notifications
- [x] `feature/deploiement` : workflows de déploiement o2switch (API + front), cron, sous-domaines `demo.bsandoz.fr` et `api.demo.bsandoz.fr`
- [x] `feature/reservation-3-etapes` : réservation en 3 étapes repliables (bloc `StepCard`), sans véhicule ; tranches de zone colorées ; communes en phrase ; lien « Fidélité » et carte du client connecté
- [x] `feature/entete-compact` : en-tête sur une ligne, menu déroulant sur téléphone
- [x] `feature/reservation-guidee` : chaque choix de la réservation amène à la partie suivante
- [x] `feature/communes-repliees` : communes desservies repliées sur l'accueil
- [x] `feature/produits-upsell` : produits vendus avec la réservation (stock géré dans l'espace pro, payés avec l'acompte)
- [x] `feature/nombre-vehicules` : plusieurs véhicules par réservation, options par véhicule, formules compactes
- [x] `feature/payer-plus-tard` : acompte payable plus tard, créneau revérifié, changement de créneau et annulation d'une réservation non payée
- [x] `feature/page-professionnels` : page Pro sur devis et formulaire de contact
- [x] `feature/upsell-fenetre` : produits proposés dans une fenêtre au paiement (bloc `Dialog`)
- [x] `feature/devis-hors-zone` : page `/devis` et lien depuis une adresse hors zone
- [x] `feature/facturation` : factures numérotées émises à la prestation faite, envoyées au client, imprimables en PDF
- [x] `feature/reglages-details` : remise par véhicule supplémentaire (phares 45 € puis 40 €), avoirs à l'annulation tardive, « Désodorisant Perfect Clean »
- [x] `feature/tableau-de-bord` : Ma journée (tournée, GPS, produits à charger), Choses à faire, Chiffres du mois, Clients
- [x] `feature/modifier-formules` : mode « Modifier » sur le site public : formules, options et prix modifiables en place
- [x] `feature/avis-google` : demande d'avis jointe au mail de facture envoyé à la prestation faite (lien Google réglé dans Réglages, vide par défaut)
- [x] `feature/creneaux-groupes` : créneaux proches d'un rendez-vous déjà prévu proposés en premier
- [x] `feature/fiche-client` : onglet Clients (recherche, total dépensé, panier moyen, dernière visite, historique, avoir modifiable, fidélité, à relancer après 90 jours)
- [x] `feature/comptabilite` : module `Comptabilite` (dépenses ponctuelles ou mensuelles), chiffre d'affaires, dépenses et résultat par mois, onglet Comptabilité
- [x] `feature/edition-partout` : crayons « Modifier » sur tout le site pour le pro connecté (sans bouton), aperçu en direct dans le catalogue, suivi des demandes dans `docs/demandes.md`
- [x] `feature/pro-affichage` : planning à la hauteur de l'écran, prochain rendez-vous sur le tableau de bord, « Utiliser ma position », réservation guidée d'étape en étape
- [x] `feature/agenda-espace` : ajout à l'agenda (client et pro), « Mon espace » restructuré (coordonnées modifiables), itinéraire Google Maps ou Waze
- [x] `feature/crayons-planning` : crayons en icône bien placés, planning semaine lisible avec clic vers le détail, rubriques de l'espace pro dans une colonne à gauche
- [x] `feature/profil-icones` : Mon espace façon réglages, icônes au trait, zones modifiables en pointillés avec crayon en haut à droite, photo de l'accueil modifiable
- [x] `feature/navbar-ordre` : catalogue par catégorie, détail de rendez-vous structuré, barre de navigation dans l'ordre logique (liens, Réserver, compte, thème)
- [x] `feature/produits-grille` : produits en grille avec catégories et filtres, stock visible du client, détail de rendez-vous compact, réservation pré-remplie
- [x] `feature/historique` : historique des rendez-vous (date de réservation, tri, filtres, fiche au clic)
- [x] `feature/clients-filtres` : clients triables et filtrables
- [x] `feature/ordre-glisser` : ordre des formules, options et produits par glisser-déposer (bloc `SortableList`), barre du haut sur une ligne sur téléphone
- [x] `feature/relance-auto` : relance automatique par e-mail des clients absents (réglable, désinscription)

## À faire
- [ ] `feature/facturation-electronique` : envoi automatique des factures (clients pro) et des données de vente (particuliers) à la plateforme agréée choisie, via son API (voir `docs/demandes.md`, « À faire »)

## Deuxième client : Croc's (kebab, 220 rue de Rouen, Amiens)
Site vitrine avec la carte, que le patron modifie lui-même. Démo privée (adresse secrète, `noindex`, bandeau « Maquette proposée par Baptiste Sandoz ») tant qu'il n'a pas accepté ; rien au nom de Croc's n'est publié sans son accord.
- [x] `feature/carte-domaine` : kit, module `Carte` (domaine) : rubriques et articles ; prix changé barré 1 mois, « Nouveau » 1 mois, « Épuisé » jusqu'au lendemain (heure du commerce), photo
- [x] `feature/carte-api` : kit, module `Carte` : cas d'usage, Doctrine, routes publiques (carte) et pro (ajouter, modifier, prix, épuisé, ordre, photo réduite à l'envoi)
- [x] `feature/carte-ui` : kit front, bloc `Carte` (carte en code, façon tableau : prix barré, « Nouveau », « Épuisé », notes de rubrique, thème `--bs-carte-*`)
- [x] `feature/carte-editeur` : kit front, bloc `EditeurCarte` (espace pro, pensé pour le téléphone : prix en deux gestes, « Épuisé » en une touche, photo)
- [x] `feature/crocs-app` : `apps/crocs/front` : site d'une page (accueil, appeler, itinéraire, carte en code, horaires, temps de trajet voiture / vélo / pied, avis, photos), démo privée (bandeau, `noindex`)
- [x] `feature/crocs-espace-pro` : `apps/crocs/api` (base dédiée, module `Carte`) et espace du patron (`EditeurCarte`), horaires et fermetures exceptionnelles modifiables
- [x] `feature/crocs-deploiement-auto` : site de Croc's envoyé par GitHub (photos gardées sur le serveur), API mise en place par cron
- [x] `feature/carte-prix-sans-barre` : changer un prix sans barrer l'ancien (au choix dans la fiche de l'article)
- [x] `feature/defilant` : kit front, bloc `Defilant` (avis qui défilent par 3, toutes les 3 s, pause), utilisé pour les avis de Croc's
- [x] `feature/crocs-avis-photos` : avis et photos ajoutés à la main par le patron (onglets « Avis » et « Photos »), affichés en défilement
- [x] `feature/crocs-mentions-legales` : mentions légales et données personnelles, bandeau de maquette retiré, mention du créateur en pied de page
- [x] `feature/crocs-appli-pro` : espace pro installable sur le téléphone (accès direct à /pro), déconnexion après 30 minutes sans activité
- [x] `feature/carte-ajustee` : kit front, la carte compacte tient toujours à l'écran (rapetisse, puis pages)
- [x] `feature/visionneuse` : kit front, bloc `Visionneuse` (photo agrandie au clic) ; commandes du `Defilant` discrètes
- [x] `feature/crocs-modifier-sur-le-site` : le patron modifie son site en le touchant (plats, prix, rubriques, accroche, annonce, horaires), kit `CarteModifiable`
- [x] `feature/crocs-couts` : onglet « Coûts » de l'espace pro (coût du site aujourd'hui, options, dans le temps, prix participatif)
- [x] `feature/crocs-avis-createur` : demande d'avis Google pour le créateur, dans l'espace pro, jusqu'à « C'est fait » (lien de la fiche à renseigner)
- [ ] `feature/crocs-contenus` : carte relevée (`docs/crocs/carte-releve.md`, prix à faire valider), couleurs rouge et jaune ; photos et avis : avec l'accord du patron
- [ ] `feature/crocs-demo` : démo privée en ligne (sous-domaine secret, `noindex`, bandeau)

## Démonstration : site fictif d'avocat
Site vitrine d'un cabinet d'avocat fictif au nom de Baptiste Sandoz (qui n'est pas avocat, dit partout sur le site), pour montrer un site de profession libérale. Jamais indexé.
- [x] `feature/avocat-demo` : `apps/avocat/front` : une page (cabinet, parcours, 3 domaines numérotés, contact), mentions légales, confidentialité, coordonnées fictives ; CI et envoi automatique (secret `FTP_SERVER_DIR_AVOCAT_FRONT`)
- [x] `feature/avocat-penaliste` : cabinet de droit pénal identifiable (vocabulaire juridique, garde à vue, procédure, honoraires), photos des juridictions d'Abbeville et d'Amiens avec crédits
