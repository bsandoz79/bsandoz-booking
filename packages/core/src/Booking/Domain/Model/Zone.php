<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

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
    }
}
