<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Annule selon les règles, rembourse l'acompte si annulation gratuite, notifie client et pro.
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class AnnulerReservation
{
    public function __invoke(string $reservationId, string $actorUserId): void
    {
        throw new \LogicException('À implémenter');
    }
}
