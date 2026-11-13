<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Geo;

use Bsandoz\Core\Booking\Domain\Port\Geocoder;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Géocodage gratuit via la Base Adresse Nationale (api-adresse.data.gouv.fr), sans clé ni abonnement.
 * GET https://api-adresse.data.gouv.fr/search/?q=…&limit=5 → features[].geometry.coordinates [lng, lat], properties.label
 * GET https://api-adresse.data.gouv.fr/reverse/?lat=…&lon=… → adresse la plus proche d'une position (non mise en cache).
 *
 * Cache : 30 jours pour le géocodage d'une adresse, 1 jour pour l'autocomplétion.
 * API indisponible ou réponse invalide : aucun résultat (et rien n'est mis en cache), pour ne jamais bloquer une réservation.
 */
final class ApiAdresseGeocoder implements Geocoder
{
    private const URL = 'https://api-adresse.data.gouv.fr/search/';
    private const URL_REVERSE = 'https://api-adresse.data.gouv.fr/reverse/';
    private const MIN_LENGTH = 3;
    private const MAX_LIMIT = 10;
    private const TTL_GEOCODE = 30 * 86400;
    private const TTL_SUGGEST = 86400;

    public function __construct(
        private HttpClientInterface $http,
        private CacheInterface $cache,
    ) {
    }

    public function geocode(string $address): ?array
    {
        return $this->search($address, 1, false, self::TTL_GEOCODE)[0] ?? null;
    }

    public function suggest(string $query, int $limit = 5): array
    {
        return $this->search($query, max(1, min(self::MAX_LIMIT, $limit)), true, self::TTL_SUGGEST);
    }

    public function reverse(float $lat, float $lng): ?array
    {
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return null;
        }
        // Position personnelle : jamais mise en cache.
        return $this->fetch(self::URL_REVERSE, ['lat' => round($lat, 6), 'lon' => round($lng, 6), 'limit' => 1])[0] ?? null;
    }

    /** @return list<array{label: string, lat: float, lng: float}> */
    private function search(string $query, int $limit, bool $autocomplete, int $ttl): array
    {
        $query = trim(preg_replace('/\s+/', ' ', $query) ?? '');
        if (mb_strlen($query) < self::MIN_LENGTH) {
            return [];
        }

        $key = sprintf('bsandoz_geo_%s_%d_%s', $autocomplete ? 'suggest' : 'geocode', $limit, md5(mb_strtolower($query)));
        $failed = false;
        $results = $this->cache->get($key, function (ItemInterface $item) use ($query, $limit, $autocomplete, $ttl, &$failed): array {
            $results = $this->fetch(self::URL, ['q' => $query, 'limit' => $limit, 'autocomplete' => $autocomplete ? 1 : 0]);
            if ($results === null) {
                $failed = true;
                $item->expiresAfter(1);

                return [];
            }
            $item->expiresAfter($ttl);

            return $results;
        });

        if ($failed) {
            $this->cache->delete($key);
        }

        return $results;
    }

    /**
     * @param array<string, string|int|float> $parametres
     * @return list<array{label: string, lat: float, lng: float}>|null null si l'API n'a pas répondu correctement
     */
    private function fetch(string $url, array $parametres): ?array
    {
        try {
            $data = $this->http->request('GET', $url, [
                'query' => $parametres,
                'headers' => ['User-Agent' => 'bsandoz-booking'],
                'timeout' => 5,
            ])->toArray();
        } catch (ExceptionInterface) {
            return null;
        }

        if (!isset($data['features']) || !is_array($data['features'])) {
            return null;
        }

        $results = [];
        foreach ($data['features'] as $feature) {
            $label = $feature['properties']['label'] ?? null;
            $coordinates = $feature['geometry']['coordinates'] ?? null;
            if (!is_string($label) || !is_array($coordinates) || !is_numeric($coordinates[0] ?? null) || !is_numeric($coordinates[1] ?? null)) {
                continue;
            }
            $results[] = ['label' => $label, 'lat' => (float) $coordinates[1], 'lng' => (float) $coordinates[0]];
        }

        return $results;
    }
}
