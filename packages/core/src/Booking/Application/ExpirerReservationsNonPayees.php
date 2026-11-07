<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Passe en expired les réservations pending_payment dont le blocage est dépassé (lancé par le cron).
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class ExpirerReservationsNonPayees
{
    public function __invoke(): int
    {
        throw new \LogicException('À implémenter');
    }
}
