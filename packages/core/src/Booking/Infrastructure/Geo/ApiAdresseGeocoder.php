<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Geo;

use Bsandoz\Core\Booking\Domain\Port\Geocoder;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Géocodage gratuit via la Base Adresse Nationale (api-adresse.data.gouv.fr).
 * GET https://api-adresse.data.gouv.fr/search/?q=...&limit=5 → features[].geometry.coordinates [lng, lat], properties.label
 */
final class ApiAdresseGeocoder implements Geocoder
{
    public function __construct(private HttpClientInterface $http)
    {
    }

    /** @todo Appeler l'API, prendre le 1er résultat, mettre en cache 30 jours. */
    public function geocode(string $address): ?array { throw new \LogicException('À implémenter'); }

    /** @todo Autocomplétion (limit), cache court. */
    public function suggest(string $query, int $limit = 5): array { throw new \LogicException('À implémenter'); }
}
