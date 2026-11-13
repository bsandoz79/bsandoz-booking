<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Zone d'intervention : point de départ, rayon gratuit, distance maximale et frais de déplacement au-delà du rayon gratuit,
 * soit par tranches (`paliers`, ex. jusqu'à 15 km : 5 €, jusqu'à 30 km : 10 €), soit au km (`pricePerKm`) sans tranche.
 */
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
        /** @var list<PalierDeplacement> tranches triées par distance croissante (vide : prix au km) */
        public readonly array $paliers = [],
        /**
         * Rayon (à vol d'oiseau) de la ville de départ autour de son centre : toute la ville compte pour 0 km, et le
         * rayon offert, les tranches et la distance maximale se comptent à partir de sa limite.
         */
        public readonly float $rayonVilleKm = 0.0,
    ) {
        if (abs($originLat) > 90 || abs($originLng) > 180) {
            throw new DomainError('Le point de départ a des coordonnées invalides.');
        }
        if ($rayonVilleKm < 0 || $rayonVilleKm > 30) {
            throw new DomainError('Le rayon de la ville de départ doit être compris entre 0 et 30 km.');
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
        $precedent = $freeRadiusKm;
        foreach ($paliers as $palier) {
            if ($palier->jusquaKm <= $precedent) {
                throw new DomainError('Les tranches de déplacement doivent aller en distance croissante, au-delà du rayon offert.');
            }
            $precedent = $palier->jusquaKm;
        }
    }
}
