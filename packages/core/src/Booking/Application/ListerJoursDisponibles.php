<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Jours du mois avec au moins un créneau, pour une durée et une adresse.
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class ListerJoursDisponibles
{
    /** @return list<string> dates Y-m-d */
    public function __invoke(int $year, int $month, int $durationMin, float $lat, float $lng): array
    {
        throw new \LogicException('À implémenter');
    }
}
