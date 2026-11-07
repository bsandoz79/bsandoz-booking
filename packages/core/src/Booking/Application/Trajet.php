<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Temps de trajet (minutes) depuis le point de départ du pro.
 * Activité sur place (pas de zone) : 0. À domicile : l'adresse est obligatoire et doit être dans la zone.
 */
final class Trajet
{
    public function __construct(
        private SettingsProvider $settings,
        private ZoneCalculator $zoneCalculator,
    ) {
    }

    /** @throws DomainError adresse manquante ou hors zone */
    public function __invoke(?float $lat, ?float $lng): int
    {
        $zone = $this->settings->zone();
        if ($zone === null) {
            return 0;
        }
        if ($lat === null || $lng === null) {
            throw new DomainError('Une adresse est nécessaire pour calculer le temps de trajet.');
        }

        $quote = $this->zoneCalculator->quote($zone, $lat, $lng);
        if (!$quote->inZone) {
            throw new DomainError('Cette adresse est en dehors de la zone d\'intervention.');
        }

        return $quote->travelMinutes;
    }

    /** Trajet vers une adresse déjà réservée (sans contrôle de zone : la zone a pu changer depuis). */
    public function versReservation(float $lat, float $lng): int
    {
        $zone = $this->settings->zone();

        return $zone === null ? 0 : $this->zoneCalculator->quote($zone, $lat, $lng)->travelMinutes;
    }
}
