<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Infrastructure\Geo\ApiAdresseGeocoder;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

/** Adaptateur api-adresse.data.gouv.fr, testé avec un faux client HTTP (aucun appel réseau). */
final class ApiAdresseGeocoderTest extends TestCase
{
    /** @var list<array{string, string, array<mixed>}> requêtes reçues : méthode, URL, options */
    private array $requests = [];

    /** @param list<MockResponse> $responses */
    private function geocoder(array $responses): ApiAdresseGeocoder
    {
        $this->requests = [];
        $http = new MockHttpClient(function (string $method, string $url, array $options) use (&$responses): MockResponse {
            $this->requests[] = [$method, $url, $options];

            return array_shift($responses) ?? new MockResponse('', ['http_code' => 500]);
        });

        return new ApiAdresseGeocoder($http, new ArrayAdapter());
    }

    private static function features(): MockResponse
    {
        return new MockResponse(json_encode(['features' => [
            ['properties' => ['label' => '12 Rue de l\'Exemple 80000 Amiens'], 'geometry' => ['coordinates' => [2.2958, 49.8941]]],
            ['properties' => ['label' => '12 Rue de l\'Exemple 80100 Abbeville'], 'geometry' => ['coordinates' => [1.8332, 50.1054]]],
            ['properties' => ['label' => 'Sans coordonnées'], 'geometry' => []],
        ]], JSON_THROW_ON_ERROR));
    }

    public function testAdresseAPartirDUnePosition(): void
    {
        $geocoder = $this->geocoder([self::features(), self::features()]);

        self::assertSame(['label' => '12 Rue de l\'Exemple 80000 Amiens', 'lat' => 49.8941, 'lng' => 2.2958], $geocoder->reverse(49.894, 2.296));
        [, $url, $options] = $this->requests[0];
        self::assertStringStartsWith('https://api-adresse.data.gouv.fr/reverse/', $url);
        self::assertSame(['lat' => 49.894, 'lon' => 2.296, 'limit' => 1], $options['query']);

        // Jamais mise en cache : un second appel interroge de nouveau l'API.
        $geocoder->reverse(49.894, 2.296);
        self::assertCount(2, $this->requests);
        self::assertNull($geocoder->reverse(120.0, 2.0));
    }

    public function testAutocompletion(): void
    {
        $geocoder = $this->geocoder([self::features()]);

        self::assertSame([
            ['label' => '12 Rue de l\'Exemple 80000 Amiens', 'lat' => 49.8941, 'lng' => 2.2958],
            ['label' => '12 Rue de l\'Exemple 80100 Abbeville', 'lat' => 50.1054, 'lng' => 1.8332],
        ], $geocoder->suggest('  12 rue   de l\'exemple '), 'les résultats sans coordonnées sont ignorés');

        [$method, $url, $options] = $this->requests[0];
        self::assertSame('GET', $method);
        self::assertStringStartsWith('https://api-adresse.data.gouv.fr/search/', $url);
        self::assertStringContainsString('q=12%20rue%20de%20l%27exemple', $url, 'espaces normalisés');
        self::assertStringContainsString('limit=5', $url);
        self::assertStringContainsString('autocomplete=1', $url);
        self::assertContains('User-Agent: bsandoz-booking', $options['headers'] ?? []);
    }

    public function testGeocodagePremierResultat(): void
    {
        $geocoder = $this->geocoder([self::features()]);

        self::assertSame(['label' => '12 Rue de l\'Exemple 80000 Amiens', 'lat' => 49.8941, 'lng' => 2.2958], $geocoder->geocode('12 rue de l\'Exemple, Amiens'));
        self::assertStringContainsString('limit=1', $this->requests[0][1]);
        self::assertStringContainsString('autocomplete=0', $this->requests[0][1]);
    }

    public function testGeocodageSansResultat(): void
    {
        self::assertNull($this->geocoder([new MockResponse('{"features": []}')])->geocode('adresse introuvable'));
    }

    public function testMoinsDeTroisCaracteresSansAppel(): void
    {
        $geocoder = $this->geocoder([]);

        self::assertSame([], $geocoder->suggest('12'));
        self::assertSame([], $this->requests);
    }

    public function testResultatMisEnCache(): void
    {
        $geocoder = $this->geocoder([self::features()]);

        $geocoder->suggest('12 rue de l\'Exemple');
        $geocoder->suggest('12 RUE DE L\'EXEMPLE');

        self::assertCount(1, $this->requests, 'deuxième recherche servie par le cache (casse ignorée)');
    }

    public function testApiIndisponibleSansResultatNiCache(): void
    {
        $geocoder = $this->geocoder([new MockResponse('erreur', ['http_code' => 503]), self::features()]);

        self::assertSame([], $geocoder->suggest('12 rue de l\'Exemple'));
        self::assertCount(2, $geocoder->suggest('12 rue de l\'Exemple'), 'l\'échec n\'est pas mis en cache : nouvel essai');
        self::assertCount(2, $this->requests);
    }

    public function testReponseInattendue(): void
    {
        self::assertSame([], $this->geocoder([new MockResponse('{"type": "autre"}')])->suggest('12 rue de l\'Exemple'));
    }

    public function testLimiteBornee(): void
    {
        $geocoder = $this->geocoder([self::features(), self::features()]);

        $geocoder->suggest('12 rue de l\'Exemple', 50);
        $geocoder->suggest('12 rue de la Paix', 0);

        self::assertStringContainsString('limit=10', $this->requests[0][1]);
        self::assertStringContainsString('limit=1', $this->requests[1][1]);
    }
}
