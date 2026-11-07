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

Déjà implémenté et testé : `Shared\Domain\Money`, `Shared\Domain\TimeRange`, `Shared\Infrastructure\SystemClock`, `Shared\Infrastructure\FrozenClock`, `Booking\Domain\Service\CreneauCalculator`, `Booking\Domain\Service\ZoneCalculator`, `Catalog\Domain\Service\PrixCalculator`.
Le reste : méthodes `@todo` à implémenter selon `docs/plan.md`.

## Horloge
Tout code qui a besoin de « maintenant » reçoit le port `Shared\Domain\Clock` (jamais `new \DateTimeImmutable()`). En production : `SystemClock` (UTC). Dans les tests : `FrozenClock` (`new FrozenClock('2026-11-07 10:00')`, puis `modify('+10 minutes')` ou `set(...)`), toujours en UTC.

## Qualité
- `composer test` : PHPUnit (`tests/Unit`).
- `composer stan` : PHPStan niveau 8, configuré dans `phpstan.neon.dist`. Les classes encore `@todo` y ont une entrée `ignoreErrors` (dépendances injectées non lues) : la supprimer dès que la classe est implémentée.
