<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Service;

use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Booking\Domain\Model\ZoneQuote;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Distance, frais de déplacement et temps de trajet depuis le point de départ du pro.
 * Distance routière estimée = distance à vol d'oiseau × roadFactor.
 */
final class ZoneCalculator
{
    private const EARTH_RADIUS_KM = 6371.0;

    public function quote(Zone $zone, float $lat, float $lng): ZoneQuote
    {
        $distance = round($this->haversine($zone->originLat, $zone->originLng, $lat, $lng) * $zone->roadFactor, 1);
        $inZone = $distance <= $zone->maxDistanceKm;
        $billableKm = (int) ceil(max(0.0, $distance - $zone->freeRadiusKm));
        $fee = $inZone ? $zone->pricePerKm->multiply($billableKm) : Money::zero();
        $minutes = (int) (ceil(($distance / $zone->averageSpeedKmh * 60) / 5) * 5);

        return new ZoneQuote($distance, $inZone, $fee, $minutes);
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * self::EARTH_RADIUS_KM * asin(min(1.0, sqrt($a)));
    }
}
