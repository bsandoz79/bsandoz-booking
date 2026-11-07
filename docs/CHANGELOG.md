# Journal des modifications

## [Non publié]
### Ajouté
- Structure du monorepo (kit back, kit front, application detailing), règles du projet et documentation.
- Kit back `packages/core` : modules Shared, Auth, Catalog, Booking, Payment, Notification, Admin (architecture hexagonale, méthodes `@todo`).
- Logique métier implémentée : `Money`, `TimeRange`, `PrixCalculator`, `ZoneCalculator`, `CreneauCalculator`.
- Tests unitaires : Money, ZoneCalculator, CreneauCalculator, PrixCalculator (10 tests).
- Kit front `packages/ui` : thème `--bs-*`, blocs Calendar et SlotPicker avec tests.
- Blocs OptionCard, ChoiceChips, PriceSummary, Stepper avec tests (15 tests front au total).
- Module métier detailing : types de véhicule, catalogue marque/modèle → type, `DetailingVarianteResolver` et ses tests.
- Site detailing (front) : thème, accueil, en-tête, pied de page, parcours de réservation en 8 étapes branché sur les blocs du kit, données de démonstration, service API (bascule vers la vraie API via `VITE_API_URL`), géocodage api-adresse.data.gouv.fr, test fonctionnel du parcours.
- Kit back : accesseurs des entités `User` (prénom, nom, téléphone, date de création) et `Reservation` (prestation, variante, options, adresse, coordonnées, frais de déplacement, données métier, notes), avec tests unitaires (5 tests).

- Kit back : configuration PHPStan `phpstan.neon.dist` (niveau 8, `src` et `tests`) ; les dépendances encore inutilisées des classes `@todo` sont ignorées classe par classe, à retirer dans la branche qui les implémente.
- Kit back : `composer.lock` non versionné (bibliothèque : les versions sont fixées par chaque application cliente).
- API detailing : squelette Symfony 7.4 LTS (la 7.3 n'est plus maintenue et ses versions sont bloquées pour failles de sécurité), PHP 8.3 minimum, `APP_SECRET` uniquement dans `.env.local`.
- API detailing : kit `bsandoz/core` (dépôt `path`), Doctrine ORM et migrations (MySQL), Twig, Mailer, Security, LexikJWT, Stripe, CORS ; `VarianteResolver` du kit branché sur `DetailingVarianteResolver`. Aucun secret dans `.env` (`JWT_PASSPHRASE` dans `.env.local`).
- API detailing : PHPUnit, PHPStan niveau 8 et MakerBundle (dev), scripts `composer test` et `composer stan`.
- Kit back : tests complets de `Money` (zéro, immuabilité, multiplication, pourcentage arrondi au centime supérieur, minimum, égalité, format français).
- Kit back : tests de `TimeRange` (durée, bornes invalides, chevauchement symétrique avec bornes exclues, inclusion).
- Kit back : horloge figée `FrozenClock` (UTC, déplaçable) pour les tests, et tests de `SystemClock` / `FrozenClock` (48 tests back au total).
- Catalogue (domaine) : `Prestation` garde les identifiants de ses options (plus les objets) et expose tarifs, prix et durée de base ; `Option` a une description ; `Devis` porte la variante et la zone (dans la zone, distance, temps de trajet) ; erreur `NotFound` ; `OptionRepository::allActive()`. Tests de `Prestation`.
- Catalogue (persistance) : mapping XML Doctrine de `Prestation`, `Option`, `Category` ; types `bsandoz_money` et `bsandoz_tarifs` ; `DoctrinePrestationRepository` et `DoctrineOptionRepository` ; tests d'intégration sur SQLite en mémoire (suite PHPUnit `integration`).
- Catalogue : cas d'usage `ListerCatalogue` (formules actives avec tarifs par variante, options actives proposées) et ses tests ; repositories en mémoire pour les tests (`tests/Double`).
- Catalogue : cas d'usage `CalculerDevis` (variante déduite par le métier, sinon variante explicite ; options ; frais kilométriques ; adresse hors zone signalée par `inZone = false` sans frais ; acompte en % ou fixe plafonné) et ses tests.
- Réservation : `ConfiguredSettingsProvider`, règles et zone lues dans la configuration de l'application en attendant l'espace pro.
- API : `CatalogController` (`GET /api/v1/catalog`, `POST /api/v1/booking/quote`), validation du corps (`QuoteRequest`), erreurs en `application/problem+json` (`ProblemJsonListener` : 404, 422, 400), avec tests.
- Kit back : `BsandozCoreBundle` câblé (configuration `bsandoz_core` : fuseau, règles, zone ; services ; routes ; mappings et types Doctrine ajoutés automatiquement ; résolveur de variante par défaut `SansVarianteResolver`).
- API detailing : réglages de démonstration (`bsandoz_core.yaml`), routes du kit, tests fonctionnels du catalogue et du devis sur SQLite (avec le résolveur detailing).
- API detailing : première migration (tables `category`, `catalog_option`, `prestation`), SQL MySQL 8 / MariaDB 10.6+.
- Réservation (domaine) : invariants de `BookingRules` (pas ≥ 5 min, horizon ≥ 1 jour, acompte 0–100 %, valeurs non négatives), `OpeningHour` (jour 1–7, heures HH:MM, « 24:00 » accepté en fin, fin après début) et `Zone` (coordonnées, distances, coefficient ≥ 1, vitesse > 0), avec tests.
- Réservation : tests complets de `CreneauCalculator` (pas, tampon, trajet, occupations, plusieurs plages, délai minimum, horizon, changement d'heure, fuseaux, jours disponibles du mois) ; durée et trajet invalides refusés.
- Réservation : tests complets de `ZoneCalculator` (calculs exacts, coefficient routier, vitesse, limites du rayon gratuit et de la distance maximale, gratuité, symétrie).
- Réservation : prestations à durée incertaine (`occupePlage` dans `CreneauCalculator`) : un seul créneau par plage d'ouverture, en début de plage, si elle est entièrement libre ; le créneau occupe la plage jusqu'à la fermeture. Tests.
- Catalogue : réglage `occupePlage` par prestation (durée incertaine), persisté (colonne `occupe_plage`, migration) et renvoyé dans `GET /catalog`.
- Réservation : zone d'intervention facultative (`bsandoz_core.zone`, `SettingsProvider::zone()` nullable) ; sans zone, activité sur place : l'adresse est ignorée, ni trajet ni frais. Tests.
- CI : job « Detailing – API » (installation, `lint:container`, PHPStan, PHPUnit).

### Corrigé
- Réservation : deux plages d'ouverture qui se chevauchent ne produisent plus de créneaux en double.
- Réservation : un pas de créneau nul ne fait plus tourner le calcul à l'infini, une vitesse nulle ne provoque plus de division par zéro (refusés à la création des règles et de la zone).
- Site detailing : nom du projet synchronisé dans `package-lock.json` ; import de `vite.config.ts` avec son extension dans `vitest.config.ts` (avertissement Vite).
- Kit back : types des tableaux renvoyés précisés pour PHPStan niveau 8 (`ExporterDonnees`, `ListerCreneaux` → `list<TimeRange>`, `ListerJoursDisponibles` → dates `Y-m-d`, `PaymentGateway` → `{sessionId, url}` et événement décodé).
