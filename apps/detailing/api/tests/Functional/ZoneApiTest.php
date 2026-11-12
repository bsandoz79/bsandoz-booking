<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Admin\Domain\Model\Setting;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
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
        self::assertSame(['surPlace' => false, 'freeRadiusKm' => 5, 'maxDistanceKm' => 50, 'pricePerKmCents' => 0,
            'paliers' => [['jusquaKm' => 15, 'prixCents' => 500], ['jusquaKm' => 30, 'prixCents' => 1000]]], $zone);
        self::assertArrayNotHasKey('originLat', $zone, 'le point de départ n\'est pas publié');
    }
}
