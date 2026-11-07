<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/** Zone d'intervention : point de départ, rayon gratuit, prix au km, distance maximale. */
final class Zone
{
    public function __construct(
        public readonly float $originLat,
        public readonly float $originLng,
        public readonly float $freeRadiusKm,
        public readonly Money $pricePerKm,
        public readonly float $maxDistanceKm,
        public readonly float $roadFactor = 1.3,
        public readonly float $averageSpeedKmh = 50.0,
    ) {
        if (abs($originLat) > 90 || abs($originLng) > 180) {
            throw new DomainError('Le point de départ a des coordonnées invalides.');
        }
        if ($freeRadiusKm < 0 || $maxDistanceKm < 0) {
            throw new DomainError('Le rayon gratuit et la distance maximale ne peuvent pas être négatifs.');
        }
        if ($roadFactor < 1) {
            throw new DomainError('Le coefficient route / vol d\'oiseau doit être au moins égal à 1.');
        }
        if ($averageSpeedKmh <= 0) {
            throw new DomainError('La vitesse moyenne doit être positive.');
        }
    }
}
