<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Crée la réservation : verrou agenda, revérifie le créneau, compte client auto (Auth\Application\CreerCompteDepuisReservation), réservation pending_payment bloquée holdMinutes, session d'acompte (Payment). Renvoie l'URL de paiement.
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class ReserverCreneau
{
    public function __invoke(ReserverCreneauCommand $command): string
    {
        throw new \LogicException('À implémenter');
    }
}
