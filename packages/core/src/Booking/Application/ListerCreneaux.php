<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Créneaux libres d'un jour (durée + trajet calculé depuis la zone).
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class ListerCreneaux
{
    public function __invoke(\DateTimeImmutable $day, int $durationMin, float $lat, float $lng): array
    {
        throw new \LogicException('À implémenter');
    }
}
