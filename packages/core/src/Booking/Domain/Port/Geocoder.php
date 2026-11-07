<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

interface Geocoder
{
    /** @return array{label: string, lat: float, lng: float}|null */
    public function geocode(string $address): ?array;

    /** @return list<array{label: string, lat: float, lng: float}> */
    public function suggest(string $query, int $limit = 5): array;
}
