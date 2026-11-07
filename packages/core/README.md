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

Déjà implémenté et testé : `Shared\Domain\Money`, `Booking\Domain\Service\CreneauCalculator`, `Booking\Domain\Service\ZoneCalculator`, `Catalog\Domain\Service\PrixCalculator`.
Le reste : méthodes `@todo` à implémenter selon `docs/plan.md`.
