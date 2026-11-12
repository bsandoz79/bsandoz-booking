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
        self::assertStringContainsString('15 prestations, 5 options et 7 plages', $tester->getDisplay());

        $this->client->request('GET', '/api/v1/catalog');
        self::assertResponseIsSuccessful();
        $catalogue = $this->json();
        $noms = array_column($catalogue['formules'], 'name');
        self::assertCount(15, $noms);
        self::assertSame(['Intérieur Éclat', 'Intérieur Signature', 'Intérieur Excellence', 'Extérieur Éclat'], array_slice($noms, 0, 4));
        self::assertCount(5, $catalogue['options']);

        $excellence = $catalogue['formules'][2];
        self::assertTrue($excellence['occupePlage'], 'durée incertaine : demi-journée');
        self::assertSame(8900, $excellence['basePriceCents'], 'un seul prix quel que soit le véhicule');
        self::assertSame([], $excellence['tarifs']);
        self::assertCount(2, $excellence['optionIds']);
        self::assertSame(['interieur', 'interieur', 'interieur', 'exterieur', 'exterieur', 'exterieur', 'optique'], array_slice(array_column($catalogue['formules'], 'category'), 0, 7));

        // Devis : le prix ne dépend pas du type de véhicule.
        $this->client->request('POST', '/api/v1/booking/quote', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode(['prestationId' => $excellence['id'], 'metierData' => ['vehicleType' => 'suv']], JSON_THROW_ON_ERROR));
        self::assertSame(8900, $this->json()['totalCents']);

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
        self::assertCount(15, $this->json()['formules']);
    }

    public function testMetAJourUnCatalogueDejaCharge(): void
    {
        $this->commande()->execute([]);
        /** @var \Bsandoz\Core\Catalog\Application\GererCatalogue $catalogue */
        $catalogue = static::getContainer()->get(\Bsandoz\Core\Catalog\Application\GererCatalogue::class);
        // Le pro avait changé le prix d'Éclat et ajouté sa propre prestation.
        $eclat = array_values(array_filter($catalogue->lister()['prestations'], static fn (array $p): bool => $p['name'] === 'Intérieur Éclat'))[0];
        $catalogue->enregistrerPrestation(['basePriceCents' => 3500] + $eclat, (string) $eclat['id']);
        $catalogue->enregistrerPrestation(['name' => 'Ma prestation', 'basePriceCents' => 1000, 'baseDurationMin' => 30, 'categoryId' => 'carte']);

        $tester = $this->commande();
        $tester->execute(['--mettre-a-jour' => true]);
        $tester->assertCommandIsSuccessful();
        self::assertStringContainsString('15 prestations mises à jour, 0 options créées', $tester->getDisplay());

        $this->client->request('GET', '/api/v1/catalog');
        $formules = array_column($this->json()['formules'], null, 'name');
        self::assertSame(2900, $formules['Intérieur Éclat']['basePriceCents'], 'prix de démonstration rétabli');
        self::assertCount(3, $formules['Intérieur Éclat']['optionIds'], 'poils, très sale, désodorisant');
        self::assertArrayHasKey('Ma prestation', $formules, 'prestation du pro conservée');
    }
}
