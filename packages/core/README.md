# bsandoz/core

Bundle Symfony du kit de réservation. Ne contient aucun métier.

| Module | Dossier |
| --- | --- |
| Shared | `src/Shared` |
| Auth | `src/Auth` |
| Catalog | `src/Catalog` |
| Booking | `src/Booking` |
| Payment | `src/Payment` |
| Notification | `src/Notification` |
| Admin | `src/Admin` |

Chaque module : `Domain/` (PHP pur) → `Application/` (cas d'usage) → `Infrastructure/` (adaptateurs).
Mapping Doctrine en XML dans `src/<Module>/Infrastructure/Persistence/Mapping/` pour garder le domaine pur.

Déjà implémenté et testé :
- Shared : `Money`, `TimeRange`, `NotFound`, horloges `SystemClock` / `FrozenClock`, types Doctrine, erreurs API en problem+json.
- Catalog : modèle, `PrixCalculator`, persistance Doctrine, `ListerCatalogue`, `CalculerDevis`, `CatalogController` (`GET /api/v1/catalog`, `POST /api/v1/booking/quote`).
- Booking : `CreneauCalculator`, `ZoneCalculator`, `ConfiguredSettingsProvider`.

Le reste : méthodes `@todo` à implémenter selon `docs/plan.md`.

## Installer le kit dans une application
1. `composer require bsandoz/core` (dépôt `path` dans le monorepo) : `BsandozCoreBundle` s'enregistre dans `config/bundles.php`.
2. `config/packages/bsandoz_core.yaml` (tout est facultatif) :
   ```yaml
   bsandoz_core:
       timezone: 'Europe/Paris'
       rules: { deposit_percent: 30, min_notice_hours: 24 }   # valeurs par défaut sinon
       zone: { origin_lat: 49.89, origin_lng: 2.29, free_radius_km: 15, price_per_km_cents: 50, max_distance_km: 60 }   # à domicile ; sans zone : activité sur place
   ```
   Types d'activité : **à domicile** (zone : trajet et frais kilométriques) ; **sur place**, client reçu dans les locaux (pas de zone, `buffer_min: 0` pour enchaîner les rendez-vous). Par prestation, `occupePlage` (durée incertaine) bloque toute la demi-journée.
3. `config/routes/bsandoz_core.yaml` : `bsandoz_core: { resource: '@BsandozCoreBundle/config/routes.php' }`.
4. Mappings et types Doctrine : ajoutés automatiquement par le bundle (`DoctrineMappings`).
5. Métier : redéfinir le port `Bsandoz\Core\Catalog\Domain\Port\VarianteResolver` dans `config/services.yaml` (par défaut `SansVarianteResolver`, aucune variante).

Services déclarés dans `config/services.php` ; chaque port a un adaptateur par défaut que l'application peut remplacer.

## Horloge
Tout code qui a besoin de « maintenant » reçoit le port `Shared\Domain\Clock` (jamais `new \DateTimeImmutable()`). En production : `SystemClock` (UTC). Dans les tests : `FrozenClock` (`new FrozenClock('2026-11-07 10:00')`, puis `modify('+10 minutes')` ou `set(...)`), toujours en UTC.

## Qualité
- `composer test` : PHPUnit, suites `unit` (`tests/Unit`, doubles en mémoire dans `tests/Double`) et `integration` (`tests/Integration`, Doctrine sur SQLite en mémoire).
- `composer stan` : PHPStan niveau 8, configuré dans `phpstan.neon.dist`. Les classes encore `@todo` y ont une entrée `ignoreErrors` (dépendances injectées non lues) : la supprimer dès que la classe est implémentée.

## Mails et limitation des tentatives
- Tant que `feature/core-notification` n'est pas faite, le port `Notifier` pointe sur `LogNotifier` : les mails (activation, mot de passe oublié…) sont écrits dans `var/log` au lieu d'être envoyés. Ne pas mettre en production dans cet état.
- Le bundle déclare des limiteurs Symfony par adresse IP (`BsandozCoreBundle::RATE_LIMITS`) : réservation, activation, mot de passe oublié, gestion par lien. Ils utilisent le pool `cache.rate_limiter` ; les tests fonctionnels le vident au démarrage.
