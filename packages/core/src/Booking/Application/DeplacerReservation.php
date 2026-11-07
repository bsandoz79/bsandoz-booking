<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Déplace vers un nouveau créneau libre, notifie client et pro.
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class DeplacerReservation
{
    public function __invoke(string $reservationId, \DateTimeImmutable $newStart, string $actorUserId): void
    {
        throw new \LogicException('À implémenter');
    }
}
