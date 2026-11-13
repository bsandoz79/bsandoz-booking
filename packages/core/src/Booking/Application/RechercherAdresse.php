<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\Geocoder;

/** Autocomplétion d'adresse pour le formulaire de réservation (au moins 3 caractères). */
final class RechercherAdresse
{
    public function __construct(private Geocoder $geocoder)
    {
    }

    /** @return list<array{label: string, lat: float, lng: float}> */
    public function __invoke(string $query, int $limit = 5): array
    {
        return $this->geocoder->suggest($query, $limit);
    }

    /** @return array{label: string, lat: float, lng: float}|null adresse la plus proche d'une position */
    public function aPosition(float $lat, float $lng): ?array
    {
        return $this->geocoder->reverse($lat, $lng);
    }
}
