<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Shared\Domain\Money;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Catalogue et devis de bout en bout : HTTP → cas d'usage du kit → Doctrine (SQLite) + résolveur detailing. */
final class CatalogApiTest extends WebTestCase
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

        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1500), 30, true, 'Retrait des poils incrustés.');
        $em->persist($poils);

        $interieur = new Prestation('interieur', 'Intérieur', Money::cents(6900), 90, 'Aspiration, plastiques, vitres.', true, 'auto', 0, false);
        $interieur->addTarif(new Tarif('citadine', Money::cents(6900), 90));
        $interieur->addTarif(new Tarif('suv', Money::cents(8900), 120));
        $interieur->addOption($poils);
        $em->persist($interieur);
        $em->flush();
        $em->clear();
    }

    /** @return array<string, mixed> */
    private function json(): array
    {
        return (array) json_decode((string) $this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }

    /** @param array<string, mixed> $body */
    private function quote(array $body): void
    {
        $this->client->request('POST', '/api/v1/booking/quote', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($body, JSON_THROW_ON_ERROR));
    }

    public function testCatalogue(): void
    {
        $this->client->request('GET', '/api/v1/catalog');

        self::assertResponseIsSuccessful();
        $catalogue = $this->json();
        self::assertSame('interieur', $catalogue['formules'][0]['id']);
        self::assertSame('auto', $catalogue['formules'][0]['category']);
        self::assertSame(['priceCents' => 8900, 'durationMin' => 120], $catalogue['formules'][0]['tarifs']['suv']);
        self::assertSame(['poils'], $catalogue['formules'][0]['optionIds']);
        self::assertFalse($catalogue['formules'][0]['occupePlage']);
        self::assertSame('poils', $catalogue['options'][0]['id']);
    }

    public function testDevisAvecTypeDeVehiculeChoisi(): void
    {
        $this->quote(['prestationId' => 'interieur', 'optionIds' => ['poils'], 'metierData' => ['category' => 'auto', 'vehicleType' => 'suv']]);

        self::assertResponseIsSuccessful();
        $devis = $this->json();
        self::assertSame('suv', $devis['variante']);
        self::assertSame(8900 + 1500, $devis['totalCents']);
        self::assertSame(3120, $devis['depositCents']);
        self::assertSame(150, $devis['durationMin']);
        self::assertSame([['label' => 'Intérieur', 'amountCents' => 8900], ['label' => 'Poils d\'animaux', 'amountCents' => 1500]], $devis['lines']);
        self::assertTrue($devis['inZone']);
    }

    public function testDevisAvecTypeDeduitDeLaMarqueEtDuModele(): void
    {
        $this->quote(['prestationId' => 'interieur', 'metierData' => ['brand' => 'Renault', 'model' => 'Clio']]);

        self::assertResponseIsSuccessful();
        self::assertSame('citadine', $this->json()['variante']);
    }

    public function testDevisAvecVarianteEnvoyeeParLeFront(): void
    {
        $this->quote(['prestationId' => 'interieur', 'variante' => 'suv']);

        self::assertResponseIsSuccessful();
        self::assertSame(8900, $this->json()['totalCents']);
    }

    public function testDevisAvecAdresseHorsZone(): void
    {
        // Paris : environ 115 km à vol d'oiseau d'Amiens, au-delà des 60 km.
        $this->quote(['prestationId' => 'interieur', 'variante' => 'citadine', 'lat' => 48.8566, 'lng' => 2.3522]);

        self::assertResponseIsSuccessful();
        $devis = $this->json();
        self::assertFalse($devis['inZone']);
        self::assertSame(0, $devis['travelFeeCents']);
    }

    public function testPrestationInconnueEn404(): void
    {
        $this->quote(['prestationId' => 'inconnue']);

        self::assertResponseStatusCodeSame(404);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
        self::assertSame('Prestation introuvable.', $this->json()['detail']);
    }

    public function testRequeteInvalideEn400(): void
    {
        $this->quote(['optionIds' => ['poils']]);

        self::assertResponseStatusCodeSame(400);
        self::assertResponseHeaderSame('Content-Type', 'application/problem+json');
    }

    public function testOptionNonAutoriseeEn422(): void
    {
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        self::assertInstanceOf(EntityManagerInterface::class, $em);
        $em->persist(new Option('moteur', 'Moteur', Money::cents(2000), 30));
        $em->flush();

        $this->quote(['prestationId' => 'interieur', 'optionIds' => ['moteur']]);

        self::assertResponseStatusCodeSame(422);
    }
}
