<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Tester\CommandTester;

/** Commande `detailing:demo:charger` : base vide → catalogue public et créneaux disponibles ; deuxième passage sans effet. */
final class ChargerDemoTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);
    }

    private function commande(): CommandTester
    {
        $kernel = $this->client->getKernel();

        return new CommandTester((new Application($kernel))->find('detailing:demo:charger'));
    }

    /** @return array<string, mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function testChargeLeCatalogueEtLesHoraires(): void
    {
        $tester = $this->commande();
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();
        self::assertStringContainsString('4 prestations, 4 options et 11 plages', $tester->getDisplay());

        $this->client->request('GET', '/api/v1/catalog');
        self::assertResponseIsSuccessful();
        $catalogue = $this->json();
        self::assertSame(['Intérieur', 'Extérieur', 'Complet', 'Nettoyage de canapé'], array_column($catalogue['formules'], 'name'));
        self::assertCount(4, $catalogue['options']);

        $complet = $catalogue['formules'][2];
        self::assertTrue($complet['occupePlage']);
        self::assertSame(['priceCents' => 14900, 'durationMin' => 180], $complet['tarifs']['suv']);
        self::assertCount(4, $complet['optionIds']);
        self::assertSame('canape', $catalogue['formules'][3]['category']);

        // Horaires chargés : le lundi 2 novembre 2026 (horloge de test figée au dimanche 1er) a des créneaux.
        $this->client->request('GET', '/api/v1/booking/days?month=2026-11&duration=90&lat=49.89&lng=2.29&prestation=' . $catalogue['formules'][0]['id']);
        self::assertResponseIsSuccessful();
        self::assertContains('2026-11-02', $this->json());
    }

    public function testNeRechargePasUnCatalogueExistant(): void
    {
        $this->commande()->execute([]);
        $tester = $this->commande();
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();
        self::assertStringContainsString('rien n\'a été chargé', $tester->getDisplay());

        $this->client->request('GET', '/api/v1/catalog');
        self::assertCount(4, $this->json()['formules']);
    }
}
