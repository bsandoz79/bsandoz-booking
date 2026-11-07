<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Créneaux libres d'un jour (durée + trajet calculé depuis la zone).
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class ListerCreneaux
{
    /** @return list<TimeRange> créneaux (début → fin de la prestation), en UTC */
    public function __invoke(\DateTimeImmutable $day, int $durationMin, float $lat, float $lng): array
    {
        throw new \LogicException('À implémenter');
    }
}
