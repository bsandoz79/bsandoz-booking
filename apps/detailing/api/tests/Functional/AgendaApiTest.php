<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Flux d'agenda du pro : adresse secrète (BSANDOZ_ICAL_SECRET de .env.test). */
final class AgendaApiTest extends WebTestCase
{
    public function testFluxAvecLeBonSecret(): void
    {
        $client = static::createClient();
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $schema = new SchemaTool($em);
        $schema->dropSchema($em->getMetadataFactory()->getAllMetadata());
        $schema->createSchema($em->getMetadataFactory()->getAllMetadata());

        $client->request('GET', '/api/v1/ical/secret-agenda-de-test-0123456789abcdef.ics');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'text/calendar; charset=utf-8');
        self::assertStringContainsString('X-WR-CALNAME:Perfect Clean', (string) $client->getResponse()->getContent());
    }

    public function testMauvaisSecretEn404(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/ical/mauvais-secret-mauvais-secret-mauvais.ics');

        self::assertResponseStatusCodeSame(404);
    }
}
