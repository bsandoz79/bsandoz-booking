<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Admin\Domain\Model\Setting;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Conditions de déplacement publiées sur le site, sans le point de départ du pro ; frais par tranches dans le devis. */
final class ZoneApiTest extends WebTestCase
{
    public function testConditionsPubliquesEtFraisParTranches(): void
    {
        $client = static::createClient();
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $schema = new SchemaTool($em);
        $schema->dropSchema($em->getMetadataFactory()->getAllMetadata());
        $schema->createSchema($em->getMetadataFactory()->getAllMetadata());

        // Le pro règle des tranches depuis Amiens : 5 km offerts, jusqu'à 15 km 5 €, jusqu'à 30 km 10 €, 50 km maximum.
        $settings = static::getContainer()->get(SettingRepository::class);
        self::assertInstanceOf(SettingRepository::class, $settings);
        $settings->save(Setting::ZONE, ['originLat' => 49.8941, 'originLng' => 2.2958, 'freeRadiusKm' => 5, 'pricePerKmCents' => 0, 'maxDistanceKm' => 50, 'roadFactor' => 1.3, 'averageSpeedKmh' => 50,
            'paliers' => [['jusquaKm' => 15, 'prixCents' => 500], ['jusquaKm' => 30, 'prixCents' => 1000]]]);

        $client->request('GET', '/api/v1/booking/zone');
        self::assertResponseIsSuccessful();
        $zone = (array) json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(['surPlace' => false, 'freeRadiusKm' => 5, 'maxDistanceKm' => 50, 'pricePerKmCents' => 0, 'roadFactor' => 1.3, 'rayonVilleKm' => 0,
            'paliers' => [['jusquaKm' => 15, 'prixCents' => 500], ['jusquaKm' => 30, 'prixCents' => 1000]]], $zone);
        self::assertArrayNotHasKey('originLat', $zone, 'le point de départ n\'est pas publié');

        // Estimation pour une position (carte du site) : même calcul que le devis, depuis Amiens.
        self::assertSame(['distanceKm' => 0, 'dansZone' => true, 'fraisCents' => 0], self::get($client, '/api/v1/booking/zone/estimation?lat=49.8941&lng=2.2958'));
        $estimation = self::get($client, '/api/v1/booking/zone/estimation?lat=49.95&lng=2.10'); // environ 20 km de route
        self::assertSame([true, 1000], [$estimation['dansZone'] ?? null, $estimation['fraisCents'] ?? null]);
        $client->request('GET', '/api/v1/booking/zone/estimation?lat=abc&lng=2');
        self::assertResponseStatusCodeSame(400);

        // Horaires d'ouverture publiés (sans identifiant interne), lus par l'accueil du site.
        $ouvertures = static::getContainer()->get(\Bsandoz\Core\Booking\Application\GererDisponibilites::class);
        self::assertInstanceOf(\Bsandoz\Core\Booking\Application\GererDisponibilites::class, $ouvertures);
        $ouvertures->definirHoraires([['weekday' => 1, 'startsAt' => '08:00', 'endsAt' => '19:00'], ['weekday' => 7, 'startsAt' => '10:00', 'endsAt' => '18:00']]);

        $client->request('GET', '/api/v1/booking/hours');
        self::assertResponseIsSuccessful();
        self::assertSame([['weekday' => 1, 'startsAt' => '08:00', 'endsAt' => '19:00'], ['weekday' => 7, 'startsAt' => '10:00', 'endsAt' => '18:00']],
            json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR));
    }

    /** @return array<mixed> */
    private static function get(KernelBrowser $client, string $url): array
    {
        $client->request('GET', $url);

        return (array) json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }
}
