<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Service;

use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Booking\Domain\Model\ZoneQuote;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Distance, frais de déplacement et temps de trajet depuis le point de départ du pro.
 * Distance routière estimée = distance à vol d'oiseau × roadFactor, comptée depuis la limite de la ville de départ
 * (rayonVilleKm autour de son centre) : toute la ville est à 0 km. Le temps de trajet, lui, part du centre.
 * Frais : rien dans le rayon offert ; puis prix de la première tranche qui couvre la distance ; au-delà de la dernière
 * tranche (sans dépasser la distance maximale), prix de la dernière tranche plus le prix au km pour les km en plus.
 * Sans tranche : prix au km pour chaque km commencé au-delà du rayon offert.
 */
final class ZoneCalculator
{
    private const EARTH_RADIUS_KM = 6371.0;

    public function quote(Zone $zone, float $lat, float $lng): ZoneQuote
    {
        $volOiseau = $this->haversine($zone->originLat, $zone->originLng, $lat, $lng);
        $distance = round(max(0.0, $volOiseau - $zone->rayonVilleKm) * $zone->roadFactor, 1);
        $inZone = $distance <= $zone->maxDistanceKm;
        $fee = $inZone ? $this->frais($zone, $distance) : Money::zero();
        $minutes = (int) (ceil(($volOiseau * $zone->roadFactor / $zone->averageSpeedKmh * 60) / 5) * 5);

        return new ZoneQuote($distance, $inZone, $fee, $minutes);
    }

    private function frais(Zone $zone, float $distance): Money
    {
        if ($distance <= $zone->freeRadiusKm) {
            return Money::zero();
        }
        if ($zone->paliers === []) {
            return $zone->pricePerKm->multiply((int) ceil($distance - $zone->freeRadiusKm));
        }
        foreach ($zone->paliers as $palier) {
            if ($distance <= $palier->jusquaKm) {
                return $palier->prix;
            }
        }
        $dernier = $zone->paliers[count($zone->paliers) - 1];

        return $dernier->prix->add($zone->pricePerKm->multiply((int) ceil($distance - $dernier->jusquaKm)));
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * self::EARTH_RADIUS_KM * asin(min(1.0, sqrt($a)));
    }
}
